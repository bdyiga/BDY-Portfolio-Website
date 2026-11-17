"""
#13's moves, keyed in Blender on the athlete's own rig.

    blender -b --python scripts/athlete/moves.py -- <athlete.raw.glb> <moves.glb> [preview-dir]

Reads the athlete unpacked (no meshopt), keys every move in MOVES below and
bakes it to one key per frame, then writes the armature and those clips to
<moves.glb>. merge-moves.mjs folds them back into src/assets/athlete.glb.
With a preview dir it also renders a strip of frames per move to check by eye.

Each move is a list of (time 0..1, channels). A channel is keyed only where a
move names it and is 0 (the idle clip's first frame) at both ends. Between
keys it eases with a monotone cubic, so extremes hold still and nothing
overshoots unless a key says so. On top of that:

- overlap: the chest trails the hips, the arms trail the chest, the forearms
  and head trail the arms (LAG), so a move travels up the body, not all at once
- planted feet: each foot is held where it stood by two-bone IK (pl = 1, the
  default) or swings free on its FK channels (pl = 0)

Axes are his: forward, to his left, up. Angles are radians.
"""

import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

FPS = 30
FWD = Vector((0, -1, 0))
LEFT = Vector((1, 0, 0))
UP = Vector((0, 0, 1))

# Seconds each group trails the hips by, at the middle of a move (none at either end).
LAG = {'hips': 0.0, 'spine': 0.03, 'arm': 0.06, 'fore': 0.1, 'head': 0.06, 'leg': 0.0}

# Seconds, matching ACTION_DURATION in src/lib/player.ts. Contact moments
# (kick boot-on-ball 0.45, pass release 0.55, pickup grab 0.45, place 0.5)
# are fixed by src/lib/choreo.ts.
DURATION = {
    'kick': 0.95,
    'pass': 0.75,
    'celebrate': 1.6,
    'wave': 1.4,
    'point': 1.1,
    'pickup': 0.6,
    'place': 0.6,
}

# Channels, by group:
#   hips   hx hy hz (shift left / forward / up, m), hp (tip forward), hw (turn left), hr (lean left)
#   spine  sp (lean forward), sw (turn left), sr (lean left), spread over the three spine bones
#   head   np (nod down), nw (turn left), nr (tilt left), shared by the neck and head
#   arm    cl_ (shrug), sf_ (raise forward), so_ (raise out to the side), st_ (roll the arm in)
#   fore   el_ (elbow bend), wr_ (wrist bend)
#   leg    hf_ (hip swing forward), ho_ (hip out), kn_ (knee bend), an_ (point the toes)
#   feet   pl_ (1 planted by IK, 0 free on FK), fx_ fy_ fz_ (where the planted foot goes: left / forward / up, m),
#          he_ (heel up, pivoting on the ball of the foot)
GROUP = {}
for c in ('hx', 'hy', 'hz', 'hp', 'hw', 'hr'):
    GROUP[c] = 'hips'
for c in ('sp', 'sw', 'sr'):
    GROUP[c] = 'spine'
for c in ('np', 'nw', 'nr'):
    GROUP[c] = 'head'
for s in 'lr':
    for c in ('cl', 'sf', 'so', 'st'):
        GROUP[f'{c}_{s}'] = 'arm'
    for c in ('el', 'wr'):
        GROUP[f'{c}_{s}'] = 'fore'
    for c in ('hf', 'ho', 'kn', 'an', 'fx', 'fy', 'fz', 'he'):
        GROUP[f'{c}_{s}'] = 'leg'
    GROUP[f'pl_{s}'] = 'leg'
DEFAULT = {'pl_l': 1.0, 'pl_r': 1.0}


def both(**kw):
    """The same channel on both sides: both(el=0.4) -> el_l, el_r."""
    out = {}
    for k, v in kw.items():
        out[f'{k}_l'] = v
        out[f'{k}_r'] = v
    return out



MOVES = {
    # Place kick off the tee, right boot. Last stride and plant, the hips coil
    # open, the leg whips through (knee straightens late, toes pointed), the
    # left arm flies out for balance, the follow-through lifts him onto his toes.
    'kick': [
        (0.0, {}),
        (0.16, dict(hz=-0.06, hy=0.02, hw=-0.28, hr=0.06, sp=0.1, sw=-0.12, sr=0.1, np=0.35,
                    pl_r=0.0, hf_r=-0.7, kn_r=1.5, an_r=0.35,
                    so_l=0.95, sf_l=0.3, el_l=-0.15, so_r=0.4, sf_r=-0.5, el_r=0.05)),
        (0.3, dict(hz=-0.075, hw=-0.12, sp=0.06, sw=-0.08, sr=0.14,
                   hf_r=-0.15, kn_r=1.55, an_r=0.6,
                   so_l=1.1, sf_l=0.2, el_l=-0.2, so_r=0.45, sf_r=-0.45, el_r=0.0)),
        (0.45, dict(hz=-0.04, hy=0.02, hw=0.12, hp=-0.04, sp=-0.06, sw=0.1, sr=0.1, np=0.45,
                    hf_r=0.85, kn_r=0.3, an_r=0.75,
                    so_l=1.0, sf_l=0.45, el_l=-0.1, so_r=0.35, sf_r=0.0, el_r=0.1, he_l=0.1)),
        (0.62, dict(hz=0.04, hy=0.05, hw=0.32, hp=-0.1, sp=-0.24, sw=0.2, sr=0.02, np=0.25,
                    hf_r=1.65, kn_r=0.22, an_r=0.6,
                    so_l=0.75, sf_l=0.85, el_l=0.1, so_r=0.25, sf_r=0.75, el_r=0.15, he_l=0.45)),
        (0.8, dict(hz=-0.03, hy=0.04, hw=0.12, sp=0.02, sw=0.06, np=0.1, pl_r=0.0,
                   hf_r=0.45, kn_r=0.55, an_r=0.15,
                   so_l=0.35, sf_l=0.25, el_l=0.2, so_r=0.15, sf_r=0.2, el_r=0.2, he_l=0.0)),
        (0.92, dict(pl_r=1.0, hz=-0.02)),
        (1.0, {}),
    ],
    # Spin pass off his left hip. Knees dip and the hips turn toward the ball
    # first, the chest follows, then everything unwinds toward the receiver; he
    # finishes with both hands pointing where it went, weight on the front foot.
    'pass': [
        (0.0, {}),
        (0.3, dict(hz=-0.07, hx=0.035, hw=0.38, sp=0.16, sw=0.42, sr=0.06, nw=-0.55,
                   **both(el=1.1, sf=0.55), so_l=0.2, so_r=0.0, he_r=0.2, fy_r=-0.01)),
        (0.45, dict(hz=-0.06, hx=0.0, hw=0.05, sp=0.18, sw=0.25, nw=-0.3, he_r=0.0)),
        (0.62, dict(hz=-0.03, hx=-0.03, hy=0.04, hw=-0.32, sp=0.22, sw=-0.42, sr=-0.04, nw=0.35,
                    **both(sf=1.35, el=0.15), so_l=0.05, so_r=0.15, st_l=0.4, st_r=0.4, he_l=0.35)),
        (0.8, dict(hz=-0.03, hy=0.04, hw=-0.3, sp=0.18, sw=-0.36, nw=0.3,
                   **both(sf=1.2, el=0.2), he_l=0.3)),
        (1.0, {}),
    ],
    # Two jumps with both arms up, then a double fist pump. Every take-off has
    # a crouch and an arm swing before it; every landing gives at the knees.
    'celebrate': [
        (0.0, {}),
        (0.1, dict(hz=-0.12, sp=0.24, np=-0.2, **both(sf=-0.55, el=0.3, he=0.0))),
        (0.2, dict(hz=0.3, sp=-0.12, np=-0.25, **both(fz=0.22, he=0.6, so=2.75, sf=0.25, el=0.12, cl=0.25))),
        (0.31, dict(hz=-0.14, sp=0.2, np=-0.1, **both(fz=0.0, he=0.0, so=2.55, sf=0.2, el=0.25, cl=0.15))),
        (0.4, dict(hz=0.2, sp=-0.1, np=-0.25, **both(fz=0.15, he=0.5, so=2.8, sf=0.2, el=0.1, cl=0.25))),
        (0.5, dict(hz=-0.1, sp=0.14, **both(fz=0.0, he=0.0, so=2.4, el=0.4, cl=0.1))),
        (0.6, dict(hz=-0.03, sp=-0.08, np=-0.15, **both(so=1.2, sf=0.6, el=2.0, cl=0.15))),
        (0.68, dict(hz=-0.06, sp=0.06, **both(so=1.0, sf=0.4, el=1.2, cl=0.0))),
        (0.76, dict(hz=-0.03, sp=-0.08, np=-0.15, **both(so=1.2, sf=0.6, el=2.0, cl=0.15))),
        (0.86, dict(hz=-0.03, sp=0.04, np=0.0, **both(so=0.3, sf=0.15, el=0.5, cl=0.0))),
        (1.0, {}),
    ],
    # A wave to the camera: weight onto the left hip, right hand up beside the
    # head, the forearm swings from the elbow with the hand trailing it.
    'wave': [
        (0.0, {}),
        (0.14, dict(hx=0.03, hr=-0.05, sr=0.05, nr=0.08, cl_r=0.15, so_r=1.65, sf_r=0.3, el_r=1.25, st_r=-1.25)),
        (0.24, dict(st_r=-0.95, wr_r=-0.2)),
        (0.34, dict(st_r=-1.6, wr_r=0.2)),
        (0.44, dict(st_r=-0.95, wr_r=-0.2)),
        (0.54, dict(st_r=-1.6, wr_r=0.2)),
        (0.64, dict(st_r=-0.95, wr_r=-0.2)),
        (0.74, dict(hx=0.03, hr=-0.05, sr=0.05, nr=0.08, cl_r=0.15, so_r=1.65, sf_r=0.3, el_r=1.25, st_r=-1.25, wr_r=0.0)),
        (0.88, dict(hx=0.0, hr=0.0, sr=0.0, nr=0.0, cl_r=0.0, so_r=0.25, sf_r=0.05, el_r=0.4, st_r=-0.1)),
        (1.0, {}),
    ],
    # Point at the work: a small draw back, then the arm shoots out and settles,
    # the chest turns with it and the free hand comes to the hip.
    'point': [
        (0.0, {}),
        (0.12, dict(sw=0.05, sf_r=0.35, so_r=0.25, el_r=1.4, st_r=0.3)),
        (0.3, dict(sw=-0.24, hw=-0.1, sp=0.08, sf_r=1.55, so_r=0.15, el_r=0.0, st_r=0.0,
                   so_l=0.45, el_l=1.3, sf_l=-0.2, st_l=0.5)),
        (0.38, dict(sw=-0.2, sf_r=1.42, el_r=0.06)),
        (0.74, dict(sw=-0.18, hw=-0.08, sp=0.06, sf_r=1.4, so_r=0.15, el_r=0.08, so_l=0.45, el_l=1.3, sf_l=-0.2, st_l=0.5)),
        (0.88, dict(sw=0.0, hw=0.0, sp=0.02, sf_r=0.2, so_r=0.1, el_r=0.5, st_r=0.0, so_l=0.15, el_l=0.4, sf_l=0.0, st_l=0.0)),
        (1.0, {}),
    ],
    # Down to the grass and back up with it: hips back and down, back flat,
    # eyes on the ball; he comes up chest first.
    'pickup': [
        (0.0, {}),
        (0.45, dict(hz=-0.34, hy=-0.1, hp=0.35, sp=0.38, np=-0.45, **both(sf=1.1, el=0.25, so=0.1, he=0.12))),
        (0.62, dict(hz=-0.28, hy=-0.07, hp=0.3, sp=0.3, np=-0.35, **both(he=0.06))),
        (1.0, {}),
    ],
    'place': [
        (0.0, {}),
        (0.5, dict(hz=-0.34, hy=-0.1, hp=0.35, sp=0.38, np=-0.45, **both(sf=1.1, el=0.25, so=0.1, he=0.12))),
        (0.62, dict(hz=-0.3, hy=-0.09, hp=0.33, sp=0.32, np=-0.4)),
        (1.0, {}),
    ],
}


# ------------------------------------------------------------------
# Interpolation
# ------------------------------------------------------------------

def monotone(ts, vs, t):
    """Fritsch-Carlson monotone cubic through (ts, vs): eases, never overshoots, still at extremes."""
    n = len(ts)
    if t <= ts[0]:
        return vs[0]
    if t >= ts[-1]:
        return vs[-1]
    d = [(vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]) for i in range(n - 1)]
    m = [0.0] * n
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1 = 2 * (ts[i + 1] - ts[i]) + (ts[i] - ts[i - 1])
            w2 = (ts[i + 1] - ts[i]) + 2 * (ts[i] - ts[i - 1])
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    i = 0
    while t > ts[i + 1]:
        i += 1
    h = ts[i + 1] - ts[i]
    s = (t - ts[i]) / h
    h00 = 2 * s ** 3 - 3 * s ** 2 + 1
    h10 = s ** 3 - 2 * s ** 2 + s
    h01 = -2 * s ** 3 + 3 * s ** 2
    h11 = s ** 3 - s ** 2
    return h00 * vs[i] + h10 * h * m[i] + h01 * vs[i + 1] + h11 * h * m[i + 1]


def channels(move, dur):
    """Channel name -> function of t, with overlap baked in."""
    keys = MOVES[move]
    names = set()
    for _, ch in keys:
        names.update(ch)
    out = {}
    for c in names:
        base = DEFAULT.get(c, 0.0)
        pts = [(0.0, base)] + [(t, ch[c]) for t, ch in keys if c in ch and 0 < t < 1] + [(1.0, base)]
        ts = [p[0] for p in pts]
        vs = [p[1] for p in pts]
        lag = LAG[GROUP[c]] / dur

        def f(t, ts=ts, vs=vs, lag=lag):
            return monotone(ts, vs, min(1.0, max(0.0, t - lag * math.sin(math.pi * t))))

        out[c] = f
    return out


# ------------------------------------------------------------------
# Rig
# ------------------------------------------------------------------

def load(path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path, bone_heuristic='TEMPERANCE', guess_original_bind_pose=False)
    arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
    ad = arm.animation_data or arm.animation_data_create()
    for tr in list(ad.nla_tracks):
        ad.nla_tracks.remove(tr)
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    bpy.context.scene.render.fps = FPS
    return arm


def assign(arm, action):
    ad = arm.animation_data
    ad.action = action
    if action is not None and hasattr(ad, 'action_slot') and action.slots:
        ad.action_slot = action.slots[0]


def update():
    bpy.context.view_layer.update()


def world_turn(pb, axis, angle):
    """Turn a bone (and all below it) about one of his axes, around its own head."""
    if abs(angle) < 1e-5:
        return
    M = pb.matrix.copy()
    head = M.translation.copy()
    R = Matrix.Rotation(angle, 4, axis)
    pb.matrix = Matrix.Translation(head) @ R @ Matrix.Translation(-head) @ M
    update()


def local_turn(pb, axis, angle):
    if abs(angle) < 1e-5:
        return
    pb.matrix_basis = pb.matrix_basis @ Matrix.Rotation(angle, 4, axis)
    update()


def aim(pb, frm, to):
    """Turn a bone so the direction `frm` (world) now points along `to`."""
    q = frm.normalized().rotation_difference(to.normalized())
    M = pb.matrix.copy()
    head = M.translation.copy()
    pb.matrix = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ M
    update()


class Rig:
    def __init__(self, arm):
        self.arm = arm
        self.pb = arm.pose.bones
        idle = bpy.data.actions['idle']
        assign(arm, idle)
        bpy.context.scene.frame_set(0)
        update()
        self.base = {pb.name: pb.matrix_basis.copy() for pb in self.pb}
        self.foot = {}
        for s in 'lr':
            foot = self.pb[f'foot_{s}']
            ball = self.pb[f'ball_{s}']
            self.foot[s] = (foot.matrix.copy(), ball.matrix.translation.copy())
        assign(arm, None)

    def reset(self):
        for pb in self.pb:
            pb.matrix_basis = self.base[pb.name]
        update()

    def pose(self, c):
        """Idle frame 0, then every channel at its value."""
        g = lambda k: c.get(k, DEFAULT.get(k, 0.0))
        P = self.pb
        self.reset()
        pelvis = P['pelvis']
        M = pelvis.matrix.copy()
        M.translation += LEFT * g('hx') + FWD * g('hy') + UP * g('hz')
        pelvis.matrix = M
        update()
        world_turn(pelvis, UP, g('hw'))
        world_turn(pelvis, LEFT, g('hp'))
        world_turn(pelvis, FWD, -g('hr'))
        for name, share in (('spine_01', 0.3), ('spine_02', 0.35), ('spine_03', 0.35)):
            world_turn(P[name], UP, g('sw') * share)
            world_turn(P[name], LEFT, g('sp') * share)
            world_turn(P[name], FWD, -g('sr') * share)
        for name, share in (('neck_01', 0.4), ('Head', 0.6)):
            world_turn(P[name], UP, g('nw') * share)
            world_turn(P[name], LEFT, g('np') * share)
            world_turn(P[name], FWD, -g('nr') * share)
        for s, sign in (('l', 1), ('r', -1)):
            world_turn(P[f'clavicle_{s}'], FWD, sign * g(f'cl_{s}') * 0.35)
            up = P[f'upperarm_{s}']
            world_turn(up, FWD, sign * g(f'so_{s}'))
            world_turn(up, LEFT, -g(f'sf_{s}'))
            local_turn(up, 'Y', sign * g(f'st_{s}'))
            local_turn(P[f'lowerarm_{s}'], 'X', g(f'el_{s}'))
            local_turn(P[f'hand_{s}'], 'Z', g(f'wr_{s}'))
            th = P[f'thigh_{s}']
            world_turn(th, FWD, sign * g(f'ho_{s}'))
            world_turn(th, LEFT, -g(f'hf_{s}'))
            local_turn(P[f'calf_{s}'], 'X', g(f'kn_{s}'))
            local_turn(P[f'foot_{s}'], 'X', g(f'an_{s}'))
        for s in 'lr':
            self.plant(s, g(f'pl_{s}'), Vector((g(f'fx_{s}'), 0, 0)) * 1 + FWD * g(f'fy_{s}') + UP * g(f'fz_{s}'), g(f'he_{s}'))

    def plant(self, s, w, off, heel):
        """Two-bone IK: put the foot back where it stood (plus `off`, heel up by `heel`), knee forward."""
        if w < 1e-3:
            return
        P = self.pb
        thigh, calf, foot = P[f'thigh_{s}'], P[f'calf_{s}'], P[f'foot_{s}']
        rest, pivot = self.foot[s]
        lift = Matrix.Translation(pivot) @ Matrix.Rotation(-heel, 4, LEFT) @ Matrix.Translation(-pivot)
        goal = Matrix.Translation(off) @ lift @ rest
        # blend from where FK put the foot to the planted foot
        cur = foot.matrix.copy()
        target = cur.translation.lerp(goal.translation, w)
        rot = cur.to_quaternion().slerp(goal.to_quaternion(), w)
        A = thigh.matrix.translation.copy()
        B = calf.matrix.translation.copy()
        la = (B - A).length
        lb = (cur.translation - B).length
        d = target - A
        reach = min(max(d.length, abs(la - lb) + 1e-3), (la + lb) * 0.999)
        d.normalize()
        # knee toward his forward, a touch out
        pole = FWD + LEFT * (0.15 if s == 'l' else -0.15)
        bend = (pole - d * pole.dot(d)).normalized()
        cosA = max(-1.0, min(1.0, (la * la + reach * reach - lb * lb) / (2 * la * reach)))
        E = A + d * (la * cosA) + bend * (la * math.sqrt(1 - cosA * cosA))
        aim(thigh, B - A, E - A)
        B = calf.matrix.translation.copy()
        aim(calf, foot.matrix.translation - B, (A + d * reach) - B)
        M = rot.to_matrix().to_4x4()
        M.translation = foot.matrix.translation
        foot.matrix = M
        update()


# ------------------------------------------------------------------
# Bake
# ------------------------------------------------------------------

def bake(rig, move):
    dur = DURATION[move]
    ch = channels(move, dur)
    frames = round(dur * FPS)
    samples = []
    for f in range(frames + 1):
        t = f / frames
        rig.pose({k: fn(t) for k, fn in ch.items()})
        samples.append({pb.name: (pb.matrix_basis.to_quaternion(), pb.matrix_basis.translation.copy()) for pb in rig.pb})
    if move in bpy.data.actions:
        bpy.data.actions.remove(bpy.data.actions[move])
    action = bpy.data.actions.new(move)
    assign(rig.arm, action)
    prev = {}
    for f, sample in enumerate(samples):
        frame = f * (dur * FPS / frames)
        for pb in rig.pb:
            q, loc = sample[pb.name]
            # keep each bone's quaternions on one side so they interpolate the short way
            if pb.name in prev and prev[pb.name].dot(q) < 0:
                q = -q
            prev[pb.name] = q
            pb.rotation_quaternion = q
            pb.keyframe_insert('rotation_quaternion', frame=frame)
            if pb.name == 'pelvis':
                pb.location = loc
                pb.keyframe_insert('location', frame=frame)
    action.use_fake_user = True
    assign(rig.arm, None)
    return action, frames


# ------------------------------------------------------------------
# Preview
# ------------------------------------------------------------------

def preview(rig, move, action, frames, out_dir):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 260
    scene.render.resolution_y = 380
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'SINGLE'
    if 'cam' not in bpy.data.objects:
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
        scene.collection.objects.link(cam)
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = 2.6
        scene.camera = cam
        floor = bpy.data.meshes.new('floor')
        floor.from_pydata([(-3, -3, 0), (3, -3, 0), (3, 3, 0), (-3, 3, 0)], [], [(0, 1, 2, 3)])
        scene.collection.objects.link(bpy.data.objects.new('floor', floor))
    cam = bpy.data.objects['cam']
    assign(rig.arm, action)
    n = 10
    for view, pos in (('front', (2.6, -4.2, 1.1)), ('side', (5.0, -0.2, 1.0))):
        cam.location = pos
        cam.rotation_euler = (Vector((0, 0, 0.95)) - Vector(pos)).to_track_quat('-Z', 'Y').to_euler()
        for i in range(n):
            scene.frame_set(round(frames * i / (n - 1)))
            scene.render.filepath = os.path.join(out_dir, f'{move}-{view}-{i:02d}.png')
            bpy.ops.render.render(write_still=True)
    assign(rig.arm, None)


def main():
    argv = sys.argv[sys.argv.index('--') + 1:]
    src, dst = argv[0], argv[1]
    prev_dir = argv[2] if len(argv) > 2 else None
    only = argv[3].split(',') if len(argv) > 3 else list(MOVES)
    arm = load(src)
    rig = Rig(arm)
    made = []
    for move in only:
        action, frames = bake(rig, move)
        made.append(action)
        if prev_dir:
            preview(rig, move, action, frames, prev_dir)
    # only the new clips go out
    for a in list(bpy.data.actions):
        if a not in made:
            bpy.data.actions.remove(a)
    rig.reset()
    for o in bpy.data.objects:
        o.select_set(o == arm or o.parent == arm)
    bpy.ops.export_scene.gltf(
        filepath=dst,
        export_format='GLB',
        use_selection=True,
        export_animation_mode='ACTIONS',
        export_force_sampling=True,
        export_frame_step=1,
        export_optimize_animation_size=False,
        export_materials='NONE',
    )
    print('MOVES', [a.name for a in made])


main()
