"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const D2R = Math.PI / 180;

/**
 * Land mask at half-degree resolution, from Natural Earth's 1:50m land
 * polygons (public domain, via the world-atlas package). One line per row of
 * latitude from 90°N down to 90°S; each line is alternating run lengths in
 * base 36, starting with water, across 720 cells from 180°W eastward.
 */
const LAND = `k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
7m.1.3.3.2.p.bg
5i.1.2.5.2.h.2.6.10.5.3.13.b8
58.5.3.15.c.3.2.1.4.5.4.2.1.12.bf
4x.1i.7.5.1.1v.2.5.9.6.3z.2.6q
4s.4.6.6.2.d.1.p.9.26.2.h.3s.5.22.2.4o
4q.8.5.3.1.c.4.k.6.2u.3e.2.1.1.1.5.6.6.4.5.2.3.1l.a.4k
4o.e.1.2.2.5.2.q.6.2n.1.5.1z.1.1.2.3.1.2.3.17.4.6.4.2.1.1.2.1.2.1v.a.4m
4o.i.2.8.2.f.1.3.d.2i.2.2.1l.7.1.1.2.4.2.2.2.b.3n.2.2.c.4g
45.5.l.f.1.i.k.2l.1o.1.1.7.1.6.8.2.3x.9.5.3.4a
49.7.3.3.7.c.1.p.9.2q.1r.1.2.j.4e.9.46
4d.4.3.5.7.3.1.1.1.1.2.o.6.2u.4.1.1s.1.4.7.4.3.4a.7.6.1.43
3n.1.2.6.f.3.a.5.b.4.1.f.f.2u.3.1.1v.5.6.7.8m
3d.8.k.2.s.1.6.a.1.2.n.2r.1.1.1u.6.3z.1.o.8.45
3b.9.3.2.8.2.n.8.5.p.h.2m.1.1.23.2.2q.6.1s.c.2c.1.1p
37.7.6.4.1.1.6.4.9.2.1.2.1.6.9.8.g.2.m.9.1.1.2.2c.3.1.4f.2.2.a.1j.3.5.q.1.1.3p
3e.2.2.b.5.7.6.9.c.6.a.6.18.27.4c.c.1k.14.1.2.17.1.3.6.1.7.1z
3h.n.2.3.7.4.4.5.2.q.17.23.1.1.1.2.46.8.1j.1e.1b.b.1.4.2.5.1.1.1p
3o.7.v.3.3.h.1.6.1a.20.1.2.47.8.1g.1.1.1e.1h.2.29
33.9.3.2.3e.21.46.7.1k.1b.4.2.1j.1.26
34.g.k.2.8.8.4.9.6.5.8.1.1d.1p.1.9.45.7.1i.1.1.3.1.16.2.2.1.2.2.1.1j.4.22
33.g.2.3.c.1.3.3.8.5.5.8.5.6.2.8.1.8.16.1m.2.4.4a.5.s.3.i.b.1.13.4.l.a.a.s.2.21
32.d.1.7.2.4.3.2.2.5.6.2.2.7.3.3.2.2.5.6.2.a.1d.2.1.1k.1.8.45.6.r.7.5.1.7.1.2.1t.1.v.o.2.24
31.c.3.j.1.6.8.9.3.2.8.7.3.8.2.4.1.5.13.1r.2.2.45.6.q.8.5.1.5.4.4.2k.1.2.j.a.2.8.1q
33.8.3.m.1.6.a.5.3.3.8.8.1.l.2.1.10.4.1.1q.43.8.q.8.2.4.1.b.2.1.1.2k.6.1.d.b.2.6.1q
0.5.15.2.1t.3.a.p.g.7.9.6.2.r.y.1.1.1j.2.6.44.1.1.5.m.b.2.5.4.9.1.2l.5.b.1.r.1j.2
14.1.1.d.1x.s.f.8.7.10.1.3.t.3.3.1b.1.4.3.5.2h.1.2.2.1.1.1.2.1.2.1e.6.k.a.3.i.1.48.15
11.r.15.1.n.5.1.m.a.a.a.f.1.i.2.1.r.2.1.1g.2.3.2l.2.1.3.1.b.1j.2.f.b.3.h.1.4a.14
y.17.j.3.1.7.3.1.3.3.9.t.1.2.5.2.4.6.e.3.7.2.5.i.1.1.o.6.1.1.1.1i.2c.2.1.j.1.2.1.3.1h.6.9.b.2.4t.g.3.2.c.7
x.1e.5.7.1.q.a.e.1.9.7.5.3.1.1.5.3.1.7.8.5.1.2.1.3.i.v.1g.2c.z.1.1.q.3.l.9.6.9.3.59.5.h.1
0.2.q.2v.2.9.4.3.7.1.6.6.4.6.1.4.6.7.a.1.3.c.z.1e.29.4.2.14.m.1.8.2.8.3.2.d.4.8.3.5.1.4n.1.11
0.5.n.2u.d.2.2.3.d.4.4.c.3.1.1.7.c.3.3.d.1.1.r.1.1.17.2f.1.1.1.2.1a.a.4.9.6.1.1.1.10.3.6.1.5o
0.9.m.2s.5.5.3.b.3.3.1.2.2.2.1.f.3.9.9.5.5.g.m.1.2.1.1.10.2o.1f.7.3.7.1c.4.5u
0.a.m.34.1.14.1.b.9.1.9.i.i.15.2q.1f.6.3.5.1c.4.5w
0.a.2.5.i.31.1.1a.1.4.i.n.h.12.2n.13.2.e.7.1d.2.3.3.5y
0.1.1.i.8.4.6.46.2.1.k.e.2.8.i.v.1.4.p.2.b.3.1k.1.1.14.6.6.4.3.1.7k
0.1.2.g.6.4b.2.5.1.3.m.b.5.6.j.3.1.r.s.4.2.c.1i.k.4.l.b.7r
0.1.7.7.c.4e.3.4.d.l.4.3.m.p.z.i.1h.h.8.i.b.7s
b.3.d.9.2.43.2.8.9.6.1.g.1.1.r.1.3.j.x.1.2.h.1f.j.7.l.3.5.2.7i.1.2.1.4.2
12.42.3.a.9.1.7.f.s.k.1.1.11.d.1g.l.6.o.4.7t.3
12.3t.1.4.6.6.3.4.g.g.q.m.14.6.1g.1.1.m.5.8n.3
j.4.c.40.a.1.d.2.c.7.2.4.s.k.2q.m.6.8q.2
u.41.i.3.m.1.2.5.3.1.t.h.2q.m.6.8o.1.4.1
t.41.j.1.6.1.3.6.1.3.9.5.x.e.1z.1.o.o.8.7v.2.o.8
s.41.r.1.3.c.19.e.2n.p.8.7k.6.5.2.k.c
t.t.2.34.x.c.1a.c.2n.o.9.7i.7.3.5.h.f
u.1.2.n.1.6.4.2w.y.g.17.1.3.7.2n.p.8.7h.8.1.5.h.h
q.3.2.o.2.9.5.2s.y.g.2.1.6.1.12.2.1.2.2b.1.c.r.2.1.4.7.7.70.e.7.2.1.6.1.j
10.i.2.4.i.2.1.2h.z.g.8.3.3u.1.1.q.j.70.d.5.x
10.g.4.2.o.2g.y.h.8.4.3t.1.1.9.1.f.a.6m.7.1.b.6.a.6.y
10.1.4.1.1.2.1.7.v.3.1.2b.1.1.u.h.1.2.4.7.3t.8.3.c.d.6l.z.6.2.1.w
19.7.2.2.w.2.1.2b.v.t.34.1.2.4.k.4.6.a.b.1.4.6g.10.7.10
19.4.3.3.x.1.2.1.1.2a.v.u.35.3.v.a.4.1.b.6f.y.c.y
17.4.4.3.y.2.1.1.1.2a.w.t.33.9.n.2.3.9.3.1.6.3.3.6d.10.c.y
16.3.19.2.3.2g.o.u.33.7.m.4.4.9.8.6j.z.e.y
13.4.1b.1.2.1.1.2h.h.2.4.u.34.6.l.6.4.6.a.6i.10.f.x
10.4.1h.2.2.2i.j.x.30.1.2.6.k.4.4.1.1.2.e.6g.11.d.10
y.2.2.1.1i.2s.b.z.1.1.2w.1.4.7.k.2.1.5.4.1.c.6e.13.d.10
v.3.1o.1.5.2o.5.17.2r.6.4.4.k.3.2.2.b.2.3.6f.4.1.z.d.b.1.o
2s.2n.6.16.2p.9.4.6.j.4.2.2.6.6q.3.1.1.1.5.1.q.8.14
q.1.1v.1.4.2p.6.12.2.5.2l.8.6.6.h.b.1.6u.2.4.4.1.q.8.14
n.1.1z.1.5.1.1.2l.6.1a.2l.7.3.a.a.7k.1.2.q.8.14
2o.1.4.1.1.2l.2.1.3.1a.2l.7.4.b.6.7m.1.3.p.5.17
b.1.2d.1.7.2j.7.1a.2i.8.4.c.6.7p.r.4.17
5.2.2p.2n.3.19.2l.3.7.c.6.7m.2.3.q.3.18
2x.2n.1.16.3.2.2y.9.3.7n.3.3.q.2.19
2v.2.2.3r.4.2.2v.7.5.7q.3.3.p.1.1b
2w.3g.5.1.2.4.5.2.2u.1.2.1.a.7q.3.4.m.2.1c
2y.4.2.36.6.2.a.2.1.1.35.7s.3.4.20
30.4.2.32.a.2.8.5.1.3.2w.7w.3.2.2.1.1z
32.3.2.2z.2.7.c.9.2t.1.3.7v.4.2.22
33.1.3.2y.1.9.b.b.2q.81.4.1.23
33.3.1.2x.1.9.b.a.2.2.2q.7y.5.1.23
34.3a.j.1.2.2.2u.29.1.5k.6.2.22
34.3a.1.1.6.1.e.1.2u.26.3.n.6.4r.7.3.21
35.2t.1.g.2.2.2.3.3a.1r.2.8.6.l.8.4q.8.1.23
34.3e.3.1.1.1.3a.s.1.x.6.4.6.k.a.4p.o.1.1o
34.2r.1.g.4.6.3c.q.3.w.7.7.1.l.8.4r.9.2.b.1.1r
34.36.3.5.3g.r.5.s.9.2.6.j.8.4r.b.2.8.1.1t
34.32.6.3.3i.k.2.6.5.r.l.g.7.4r.b.4.3.1.1x
34.30.8.2.3j.i.6.5.6.p.m.g.7.4p.c.7.1y
33.30.3f.p.4.2.8.7.6.m.p.e.8.4h.1.4.e.8.1x
33.2z.3g.o.e.1.1.6.8.k.r.c.a.4e.3.1.d.8.20
33.2z.3h.n.b.2.4.6.9.i.r.d.9.4c.j.1.4.2.21
34.2z.3f.o.b.2.6.7.7.h.9.6.c.e.8.1.2.48.k.1.27
34.2u.3l.l.n.6.6.j.5.b.8.g.b.46.n.1.25
34.2u.3l.j.e.3.a.6.4.9.1.1.2.3.5.13.7.1.2.3p.2.f.l.3.25
33.2t.3m.j.g.2.b.4.2.1.2.6.1.3.4.1a.6.3s.3.d.n.4.24
34.2s.3m.i.5.2.a.2.d.1.6.7.6.1b.8.3o.4.4.2.6.p.4.24
34.2n.1.1.1.1.3m.i.i.2.d.2.7.6.5.1b.8.3n.5.1.7.4.p.4.24
35.2m.1.2.2n.1.z.j.w.1.9.4.8.18.a.3j.g.5.n.4.25
36.2k.2.2.3o.h.w.2.a.1.2.3.4.19.a.3k.e.7.m.3.26
38.2j.1.1.2s.1.w.g.r.5.b.1.1.3.7.19.a.3m.3.1.b.5.k.4.26
37.2k.3r.e.n.1.7.3.d.3.9.1a.7.3m.2.5.9.5.i.5.26
38.2k.3v.5.2.1.b.4.1.b.7.1.p.6.2.6.1.1.1.u.4.3t.9.7.e.8.27
38.2k.3w.1.c.k.12.1.5.3.4.4p.c.6.7.1.5.9.27
39.2k.3v.1.a.n.1e.4o.d.6.d.a.26
3a.2h.3x.3.1.1.4.p.p.4.1.1.d.2.4.4n.e.6.6.d.2.1.27
3b.2g.3w.10.16.2.5.4m.f.1.a.5.1.3.2.2.2b
3d.2b.3z.x.1f.4q.h.1.3.3.2.6.2f
3g.26.3z.11.1d.4q.i.1.1.1.3.4.2.1.2g
3h.24.3y.13.1c.4r.b.1.6.5.1.1.2m
3h.23.3i.1.f.1a.e.3.p.4s.f.1.2.4.2o
3i.21.3y.1e.9.6.o.4t.i.2.2p
3j.1z.3z.1e.9.a.j.4v.f.4.2p
3j.3.4.1r.3z.1h.7.f.5.5.3.4v.39
3k.3.3.1r.3z.1k.4.5n.39
3k.3.3.19.1.1.2.1.4.9.40.78.1.1.39
3l.3.3.z.1.1.2.7.8.1.3.5.3y.39.4.3z.38
3m.4.2.y.8.2.1.1.c.4.3x.2e.1.3.1.q.5.3z.38
3n.3.2.x.q.4.3h.1.d.2j.1.r.5.3x.39
3l.1.2.2.3.t.t.4.3j.1.a.2h.1.u.6.3v.g.1.2t
3m.1.1.3.4.q.t.5.3r.2l.4.r.6.3t.3b
3n.5.3.q.u.5.3p.2n.4.r.7.3r.3b
3q.3.3.p.v.4.3p.2n.4.s.7.3.1.1.2.3h.h.1.2v
3r.2.4.o.v.4.3n.2p.5.r.e.3h.g.1.2w
3s.1.4.p.v.3.3n.2q.5.q.2.1.9.1.2.3g.3d
3s.2.5.m.x.1.3n.2s.4.r.1.1.8.2.9.3.1.1.6.2y.3d
3s.3.5.l.12.1.3i.2s.4.t.6.4.l.2v.5.2.38
3t.3.5.k.13.1.3g.2u.4.t.5.5.l.2t.5.2.39
3v.2.5.j.4j.2v.6.13.k.2r.5.3.39
3w.1.6.h.4k.2v.6.15.j.2o.7.3.39
44.g.s.9.a.1.37.2x.6.15.m.14.1.1c.a.2.3a
45.f.r.2.3.7.3g.2y.5.16.i.6.1.11.2.17.e.1.3a
45.g.t.1.5.5.3d.30.4.15.k.5.1.y.5.14.3s
46.f.f.6.h.4.3b.30.4.14.m.4.1.t.a.v.5.1.3v
1b.1.2t.h.d.7.i.4.3b.2z.5.12.o.1.4.s.b.s.7.1.3v
45.h.d.6.k.7.38.2y.6.10.1.1.s.r.d.r.43
1c.2.2r.i.c.6.s.3.1.2.30.30.7.x.u.p.h.p.7.3.3u
1c.1.2t.i.a.7.t.8.2x.30.7.y.u.o.h.p.5.4.3v
48.g.9.8.u.8.2x.2z.7.w.w.n.j.n.6.4.3v
4a.h.1.c.j.4.5.6.1.1.2.1.3.3.2r.31.6.u.x.m.l.n.t.4.37
4d.r.1a.1.2p.31.7.r.z.l.m.o.s.3.38
4e.p.41.32.7.p.10.j.o.p.r.4.37
4h.m.40.33.7.m.14.i.o.3.1.1.1.k.q.4.37
4j.7.1.c.1h.2.2h.33.8.j.16.f.q.4.3.l.p.3.38
4m.2.5.a.1.8.3r.34.6.j.17.e.y.m.n.3.39
4u.i.3c.1.d.35.6.i.19.c.10.m.m.3.39
4v.i.3o.39.4.d.1d.c.10.m.o.1.39
4w.i.3o.39.3.c.1f.b.10.m.n.2.2.1.36
50.d.3q.39.1.1.1.8.1i.b.10.m.m.1.1.1.1.1.1.3.33
52.2.1.8.18.1.2g.3b.1.5.1m.c.10.3.2.h.m.2.4.1.34
55.8.3p.3c.1.2.1p.a.p.1.b.3.2.h.n.1.39
56.7.n.2.31.3c.1r.a.11.3.5.d.o.1.3.2.1.2.31
57.6.m.2.34.39.f.1.1d.9.p.1.b.3.6.c.q.1.5.1.31
58.4.k.4.3.4.2x.3b.a.5.1e.8.11.2.7.c.q.2.1.1.1.2.31
59.4.g.e.e.1.2l.39.3.b.1e.8.10.3.7.a.s.1.1.1.35
58.5.g.7.1.b.3.4.2.1.2l.3n.1e.7.12.1.b.4.p.1.7.2.34
59.1.1.3.f.7.2.j.2o.3l.1f.5.2.1.10.1.c.3.o.1.7.1.2.1.33
5c.3.5.4.4.8.2.k.2n.3k.1g.6.1.2.z.3.a.2.o.1.9.1.4.1.30
5d.8.2.2.2.v.2o.3j.1g.3.4.2.y.4.z.1.e.3.2z
5g.3.4.12.2l.3i.1i.2.4.3.y.4.19.7.2z
5h.3.3.13.2l.3h.1o.3.z.2.18.3.1.5.2z
5i.1.5.13.2l.3f.1p.4.z.2.x.1.9.1.3.3.1.1.2z
5p.13.2l.3d.1q.4.10.3.u.2.d.3.31
5p.14.2m.p.5.2h.1q.3.11.4.s.3.d.3.31
5p.1b.2g.k.a.2g.2v.4.r.5.d.1.31
5p.1e.2e.c.1.4.d.2e.2l.4.7.5.p.8.3d
5p.1f.2f.4.o.2d.2n.5.5.6.m.8.3f
5p.1g.3d.26.2o.5.4.6.l.8.3g
5q.1g.3b.1.1.24.2q.5.4.5.9.1.a.8.3h
5p.1h.3e.22.2s.5.4.4.j.9.3h
5o.1i.3e.21.2q.1.3.5.3.4.g.d.3g
5n.1k.3d.1z.2x.5.3.4.e.e.k.1.2v
19.1.4c.1m.3b.1z.2z.6.3.2.b.1.2.e.j.1.2w
5m.1m.3b.1x.2y.1.3.7.d.j.5.1.6.1.5.2.2v
5k.1n.3c.1w.30.1.2.7.d.i.4.9.6.2.2v
5k.1n.1.1.3a.1v.35.6.1.1.b.h.k.1.2w
4x.2.k.1m.2.4.38.1u.37.7.b.h.4.1.f.1.6.1.2p
4x.1.l.1s.1.2.34.1u.38.7.c.g.4.1.6.1.7.3.6.5.3.1.2g
5i.1s.1.5.32.1u.35.1.3.8.b.e.5.2.1.3.h.6.2k
5i.1r.1.9.30.1s.3a.8.2.1.8.d.6.5.5.1.a.1.3.4.4.2.1.2.2b
5i.21.30.1r.39.1.2.8.a.d.5.6.l.1.7.6.29
5k.23.2x.1o.3f.a.2.1.4.d.5.3.1.2.k.1.1.3.3.b.25
5k.29.2s.1n.3f.9.c.2.1.5.6.3.1.3.7.2.3.4.4.5.1.e.i.1.1k
5i.2d.2r.1m.3g.8.h.2.1.1.6.2.1.3.8.1.7.1.4.1.1.k.20
5i.2e.2r.1k.3i.7.r.2.2.3.o.k.d.1.1.1.1i
5h.2g.2r.1i.3l.5.r.2.2.1.t.i.c.2.1j
5i.2j.2n.1i.1.1.3k.4.r.2.4.1.t.h.a.2.1k
5i.2k.2m.1i.3p.1.1h.1.2.1.7.h.4.6.6.1.1e
5i.2k.2n.1i.3p.4.1g.1.8.i.4.2.9.1.1d
5k.2i.2n.1i.3o.6.4.2.19.1.9.g.h.1.1c
5l.2h.2o.1h.3q.c.1g.h.k.1.19
5l.2h.2o.1h.3t.1.2.a.n.1.9.1.d.c.2.5.i.1.3.1.16
5m.2g.2p.1g.3z.9.f.4.p.3.2.7.5.4.i.2.18
5m.2g.2p.1g.47.1.1.1.1.3.3.4.6.4.r.6.6.4.o.1.12
5n.2e.2p.1h.4p.3.y.1.8.4.2.1.l.1.11
5n.2d.2q.1h.4g.2.6.3.19.5.k.2.12
5o.2c.2r.1h.4n.1.1e.4.1m
5o.2a.2t.1i.4l.1.25.1.z
5p.29.2u.1h.51.1.1.1.j.2.22
5q.27.2v.1h.5.1.4t.2.3.2.h.2.22
5q.26.2v.1i.h.1.4j.1.1.8.1.1.9.3.22
5r.25.2u.1j.h.1.4i.c.b.3.21
5r.23.2v.1k.h.2.4g.c.b.4.21
f.1.5c.22.2v.1k.f.4.4g.d.a.4.21
5s.22.2v.1k.f.4.48.3.4.d.1.1.9.4.21
5s.22.2u.1m.d.5.46.6.3.c.c.7.1y
5u.20.2u.1l.d.7.45.6.1.f.b.8.16.1.q
5v.1z.2u.1l.c.6.1.1.44.o.a.8.1x
5x.1x.2u.1k.9.b.43.1.1.q.8.8.19.1.m.1
5z.1v.2u.1j.a.a.42.1.1.u.5.9.19.1.k.1.2
61.1t.2t.1h.c.b.41.y.4.a.1w
1p.1.4c.1s.2t.1f.e.b.41.1c.1r.2.3
63.1q.2v.1e.e.b.41.1d.1v
63.1q.2w.1c.f.a.41.1e.1v
63.1q.2w.1a.i.9.41.1f.1u
64.1o.2y.17.k.9.3z.1i.1t
64.1n.2z.17.k.8.i.1.3e.1n.1r
64.1n.30.17.i.9.3s.1t.v.1.4.1.p
64.1m.31.17.h.a.e.1.3c.1u.w.1.t
64.1m.32.17.g.9.3q.1x.w.2.r
64.1l.34.16.g.9.3p.1y.y.1.q
63.1l.35.16.g.9.3n.23.1m
63.1g.3a.16.g.8.3p.22.1m
63.1e.3c.16.g.8.3o.24.1l
63.1b.3f.16.g.8.3o.25.1k
63.1a.3g.15.i.6.3p.26.1.1.1h
63.19.3i.11.m.3.3s.25.1.1.1h
63.18.3j.z.4j.26.1i
63.18.3j.10.4g.1.1.26.1i
62.19.3j.10.4h.27.1i
62.19.3k.z.4i.26.1i
62.19.3k.y.4j.27.1h
62.19.3l.x.4k.26.1h
61.19.3n.v.4l.26.1h
61.18.3p.t.4n.25.1h
61.17.3q.s.4o.25.1h
61.14.1.2.3r.r.4o.24.1i
61.14.3u.q.4p.24.1i
61.14.3v.o.4r.23.1i
61.13.3w.n.4s.r.6.16.1i
61.13.3x.l.4t.o.c.12.1j
61.12.3x.k.4v.j.i.10.1k
61.12.3x.j.4w.h.l.6.1.r.1l
60.11.40.f.4y.h.n.4.1.s.1l
60.r.1.9.41.6.56.9.w.2.2.r.1m
60.s.3.4.44.1.5c.5.y.1.3.1.1.p.1m
5z.u.aw.o.19.2.c
5z.u.as.2.3.m.1b.2.b
5y.w.ax.l.1d.1.a
5y.x.ax.k.1d.1.1.1.8
5x.x.ay.k.1d.3.8
5x.w.b0.i.1f.3.2.2.3
5x.v.b3.6.1.5.1i.8.3
5x.s.d0.7.4
5y.l.d5.6.6
5x.n.d5.5.6
5x.m.d7.3.7
5w.n.bi.1.1o.3.7
5w.i.bn.8.1b.2.1.5.8
5x.1.1.f.bo.7.1a.6.b
5w.1.1.j.bm.5.1b.5.c
5w.1.1.g.2.1.bm.5.1a.5.d
5v.2.1.g.bq.2.1a.5.f
7.1.5q.f.d1.8.e
5y.f.cz.7.h
5v.1.1.g.cy.7.i
5w.e.d0.8.i
5x.c.d1.7.j
5u.2.1.c.d2.5.k
5u.g.dq
5v.h.do
5v.1.1.f.do
5u.h.dp
5u.g.dq
5u.f.7l.1.1.1.63
5t.f.ds
5t.1.1.c.dt
5u.c.du
5u.1.1.a.du
5w.a.i.4.d8
5u.1.1.9.1.1.h.1.db
5x.1.1.3.1.4.dt
5y.2.1.1.1.4.dt
5x.2.1.2.2.5.dr
61.1.3.5.1o.1.c1
63.1.1.9.1.1.1j.1.c0
66.1.1.2.dq
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0
6t.1.1.3.d2
6m.1.2.3.d8
6j.1.2.4.2.1.d7
6g.2.1.4.dd
6g.4.dg
6f.5.dg
6a.1.2.6.1.1.69.a.2i.9.a.7.x.7.2.2.2g
68.1.2.5.69.1.3.c.1w.10.3.b.f.8.5.n.18.1.x
66.2.1.5.6c.k.1e.1o.3.7.3.1c.1z
6a.3.65.16.v.3h.1.4.1v
6a.4.5z.1j.i.3s.1u
6a.5.1.1.5.1.57.2.d.1m.h.42.1.2.2.3.1e
60.4.6.8.1.1.59.5.9.1o.f.4j.17
5t.1.6.5.2.c.4d.1.x.8.1.1.3.1n.e.4o.14
64.2.2.b.3j.1.5.1.9.1.7.1.5.1.4.1.e.2.8.21.a.4x.12
5u.3.5.5.2.b.34.1.4.2.e.e.1.e.4.3.2.2.7.2a.6.4z.1.a.q
5z.8.2.d.2t.3.3.3.d.3s.6.5e.n
5t.6.1.8.2.c.2r.4e.7.5k.i
4f.7.1.2.1c.1.1.4.3.d.2q.4e.2.1.2.5k.k
4a.1.m.1.4.1.16.e.2k.1.2.4g.2.5o.k
4a.c.3.2.1.5.2.6.3.1.a.3.6.3.1.1.7.g.2.2.2g.4m.1.5j.q
2z.1.5.5.10.4.1.10.2.9.2.u.28.1.9.a4.s
36.4.c.3.3.2.j.27.2a.1.b.a0.u
2g.3.d.8.5.f.5.2.l.22.1.1.2g.a1.2.1.w
28.1r.5.9.6.1x.2j.a0.11
1z.4f.2a.ad.z
1q.5.1.4b.29.al.z
1m.2.1.2.6.3t.a.1.2a.ar.y
18.8.5.1.4.2.5.3u.2f.ax.6.1.q
17.h.1.49.25.b1.5.1.q
1f.3y.1.9.1m.b.g.b5.1.1.1.2.q
x.2.d.41.5.5.i.4.y.a.j.az.1.3.x
v.8.h.3x.k.4.3.2.x.f.d.5.8.al.13
11.5.l.41.i.2.u.g.m.1.1.1.a.ab.14
1n.45.j.1.9.4.c.i.t.ai.16
1q.43.7.3.f.6.b.a.s.aw.13
1a.50.1f.b8.13
1g.4x.1a.be.z
1h.4v.9.2.d.g.5.bh.y
1f.54.b.cf.r
i.b.h.5b.5.cl.p
o.iz.d
w.j3.1
o.i.iu
k0
k0
k0
k0
k0
k0
k0
k0
k0
k0`;

const MASK_W = 720;
const MASK_H = 360;
let maskCache: Uint8Array | null = null;
function landMask() {
  if (maskCache) return maskCache;
  const mask = new Uint8Array(MASK_W * MASK_H);
  LAND.split("\n").forEach((row, j) => {
    let i = 0;
    let land = 0;
    for (const run of row.split(".")) {
      const len = parseInt(run, 36);
      if (land) mask.fill(1, j * MASK_W + i, j * MASK_W + i + len);
      i += len;
      land ^= 1;
    }
  });
  maskCache = mask;
  return mask;
}

function isLand(mask: Uint8Array, lat: number, lng: number) {
  const j = Math.min(MASK_H - 1, Math.max(0, Math.floor((90 - lat) * 2)));
  const i = ((Math.floor((lng + 180) * 2) % MASK_W) + MASK_W) % MASK_W;
  return mask[j * MASK_W + i] === 1;
}

/** Unit vectors for evenly spaced dots over the land, `spacing` degrees apart. */
function landDots(spacing: number) {
  const mask = landMask();
  const out: number[] = [];
  for (let lat = -90 + spacing / 2; lat < 90; lat += spacing) {
    const c = Math.cos(lat * D2R);
    const count = Math.max(1, Math.round((360 * c) / spacing));
    for (let k = 0; k < count; k++) {
      const lng = -180 + ((k + 0.5) * 360) / count;
      if (!isLand(mask, lat, lng)) continue;
      out.push(c * Math.sin(lng * D2R), Math.sin(lat * D2R), c * Math.cos(lng * D2R));
    }
  }
  return new Float32Array(out);
}

// A pin can name one of these cities instead of giving coordinates.
const CITIES: Record<string, [number, number]> = {
  "addis ababa": [9.03, 38.74], accra: [5.6, -0.19], amsterdam: [52.37, 4.9], ankara: [39.93, 32.86],
  athens: [37.98, 23.73], atlanta: [33.75, -84.39], auckland: [-36.85, 174.76], baghdad: [33.31, 44.37],
  bangkok: [13.76, 100.5], barcelona: [41.39, 2.17], beijing: [39.9, 116.4], berlin: [52.52, 13.4],
  bogota: [4.71, -74.07], boston: [42.36, -71.06], brussels: [50.85, 4.35], "buenos aires": [-34.6, -58.38],
  cairo: [30.04, 31.24], "cape town": [-33.92, 18.42], casablanca: [33.57, -7.59], chicago: [41.88, -87.63],
  copenhagen: [55.68, 12.57], dakar: [14.72, -17.47], delhi: [28.61, 77.21], denver: [39.74, -104.99],
  dhaka: [23.81, 90.41], doha: [25.29, 51.53], dubai: [25.2, 55.27], dublin: [53.35, -6.26],
  frankfurt: [50.11, 8.68], geneva: [46.2, 6.14], helsinki: [60.17, 24.94], "hong kong": [22.32, 114.17],
  istanbul: [41.01, 28.98], jakarta: [-6.21, 106.85], johannesburg: [-26.2, 28.05], karachi: [24.86, 67.01],
  khartoum: [15.5, 32.56], kinshasa: [-4.44, 15.27], kyiv: [50.45, 30.52], lagos: [6.52, 3.38],
  lima: [-12.05, -77.04], lisbon: [38.72, -9.14], london: [51.51, -0.13], "los angeles": [34.05, -118.24],
  luanda: [-8.84, 13.23], madrid: [40.42, -3.7], manila: [14.6, 120.98], melbourne: [-37.81, 144.96],
  "mexico city": [19.43, -99.13], miami: [25.76, -80.19], milan: [45.46, 9.19], montreal: [45.5, -73.57],
  moscow: [55.76, 37.62], mumbai: [19.08, 72.88], nairobi: [-1.29, 36.82], "new york": [40.71, -74.01],
  oslo: [59.91, 10.75], paris: [48.86, 2.35], prague: [50.08, 14.44], "rio de janeiro": [-22.91, -43.17],
  riyadh: [24.71, 46.68], rome: [41.9, 12.5], "san francisco": [37.77, -122.42], santiago: [-33.45, -70.67],
  "sao paulo": [-23.55, -46.63], seattle: [47.61, -122.33], seoul: [37.57, 126.98], shanghai: [31.23, 121.47],
  singapore: [1.35, 103.82], stockholm: [59.33, 18.07], sydney: [-33.87, 151.21], taipei: [25.03, 121.57],
  tehran: [35.69, 51.39], "tel aviv": [32.09, 34.78], tokyo: [35.68, 139.69], toronto: [43.65, -79.38],
  tunis: [36.81, 10.18], vancouver: [49.28, -123.12], vienna: [48.21, 16.37], warsaw: [52.23, 21.01],
  washington: [38.91, -77.04], zurich: [47.38, 8.54],
};

type Pin = { name: string; lat: number; lng: number; details: string[] };

const COORDS = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

/**
 * Each entry is `Name | details…` for a known city, or `Name | lat, lng |
 * details…` for anywhere else. The first detail line is shown in bold.
 */
function parsePins(list: string[]): Pin[] {
  const pins: Pin[] = [];
  for (const entry of list) {
    const parts = entry.split("|").map((s) => s.trim());
    const name = parts[0];
    if (!name) continue;
    const coords = parts[1]?.match(COORDS);
    if (coords) {
      pins.push({ name, lat: +coords[1], lng: +coords[2], details: parts.slice(2).filter(Boolean) });
      continue;
    }
    const known = CITIES[name.toLowerCase()];
    if (known) pins.push({ name, lat: known[0], lng: known[1], details: parts.slice(1).filter(Boolean) });
  }
  return pins;
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const wrapAngle = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;

type Layout = {
  w: number;
  h: number;
  u: number;
  cx: number;
  cy: number;
  r: number;
  narrow: boolean;
  bracketX: number;
  orbitY: number;
};

function layoutFor(w: number, h: number): Layout {
  const narrow = w < 720;
  const u = clamp(Math.min(w / 1200, h / 800), 0.55, 1.4);
  if (narrow) {
    const r = Math.min(w * 0.36, h * 0.26);
    const cy = h * 0.34;
    return { w, h, u, cx: w / 2, cy, r, narrow, bracketX: 24, orbitY: cy + r + 36 * u };
  }
  const r = Math.min(w * 0.21, h * 0.34);
  const cx = w * 0.37;
  const cy = h * 0.43;
  return { w, h, u, cx, cy, r, narrow, bracketX: cx + r + Math.max(56, w * 0.07), orbitY: cy + r + Math.min(h * 0.16, 130 * u) };
}

/**
 * A dotted globe of the world's land that turns under the pointer, with pins
 * anyone can add: a city name or a pair of coordinates in the settings, or a
 * click anywhere on the globe. The focused pin is ringed in the accent colour
 * and tied by a leader line to a bracketed card with its details.
 */
export default function DottedLocationGlobe({
  locations = [
    "Lisbon | Atlantic Cargo Lines | atlanticcargo.example | lisbon@atlanticcargo.example",
    "Cairo | Nile Delta Energy | niledelta.example | info@niledelta.example",
    "Lagos | Gulf of Guinea Ports | gogports.example | hello@gogports.example",
    "Nairobi | Rift Valley Agritech | riftvalley.example | team@riftvalley.example",
    "Addis Ababa | Highland Platinum Company | highland-platinum.example | contact@highland-platinum.example",
  ],
  focusPin = 5,
  stats = ["8 countries", "54 enterprises", "1235 employees"],
  hint = "Drag to rotate",
  globeColor = "#ff6f2e",
  pinColor = "#ffffff",
  accentColor = "#f2826a",
  background = "#141414",
  textColor = "#ffffff",
  dotSpacing = 0.9,
  tilt = 18,
  spin = 4,
  clickToPin = true,
  fontFamily = "var(--font-inter), sans-serif",
  textScale = 100,
  autoPlay = false,
}: {
  /** One pin per entry: `City | details…`, or `Name | lat, lng | details…` for any place. */
  locations?: string[];
  /** Which pin (1-based) is focused first. */
  focusPin?: number;
  /** Figures along the bottom, each `number label`. */
  stats?: string[];
  /** Caption under the rotation indicator. */
  hint?: string;
  /** Colour of the land dots and the rim light. */
  globeColor?: string;
  pinColor?: string;
  /** Colour of the focused pin and the rotation dot. */
  accentColor?: string;
  background?: string;
  textColor?: string;
  /** Degrees between land dots. Smaller is denser. */
  dotSpacing?: number;
  /** Degrees the north pole leans toward the viewer at rest. */
  tilt?: number;
  /** Idle spin in degrees per second. */
  spin?: number;
  /** Clicking open land or sea drops a new pin there. */
  clickToPin?: boolean;
  fontFamily?: string;
  textScale?: number;
  /** Moves the focus from pin to pin on its own until the globe is touched. */
  autoPlay?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const statRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [dropped, setDropped] = useState<Pin[]>([]);
  const configured = useMemo(() => parsePins(locations), [locations]);
  const pins = useMemo(() => [...configured, ...dropped], [configured, dropped]);
  const [focusState, setFocus] = useState(() => Math.max(0, Math.round(focusPin) - 1));
  // Moving the Focused Pin setting refocuses, without resetting on every render.
  const [seenFocusPin, setSeenFocusPin] = useState(focusPin);
  if (focusPin !== seenFocusPin) {
    setSeenFocusPin(focusPin);
    setFocus(Math.max(0, Math.round(focusPin) - 1));
  }
  // Removing pins in the settings can leave the focus past the end.
  const focus = Math.min(focusState, Math.max(0, pins.length - 1));
  const dots = useMemo(() => landDots(clamp(dotSpacing, 0.4, 3)), [dotSpacing]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => setSize({ w: root.clientWidth, h: root.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  const layout = size.w > 0 ? layoutFor(size.w, size.h) : null;
  const statValues = stats.map((s) => {
    const m = s.trim().match(/^([\d.,]+)\s*(.*)$/);
    return m ? { value: parseFloat(m[1].replace(/,/g, "")), label: m[2] } : { value: NaN, label: s };
  });

  // Everything the render loop reads, kept current without restarting it.
  const live = useRef({ pins, focus, globeColor, pinColor, accentColor, textColor, tilt, spin, dots, layout, statValues });
  useEffect(() => {
    live.current = { pins, focus, globeColor, pinColor, accentColor, textColor, tilt, spin, dots, layout, statValues };
  });

  const pinScreen = useRef<{ i: number; sx: number; sy: number; z: number; alpha: number }[]>([]);
  const drag = useRef<{ x: number; y: number; lx: number; ly: number; lt: number; moved: boolean; orbit: boolean } | null>(null);
  // Where a point sits around the rotation indicator, in the same terms as its dot.
  const orbitAngle = (lay: Layout, x: number, y: number) => {
    const erx = Math.max(40, lay.r * 0.3);
    const nx = (x - lay.cx) / erx;
    const ny = (y - lay.orbitY) / (erx * 0.22);
    return { angle: Math.atan2(-nx, ny) / D2R, nx, ny };
  };
  const bgRef = useRef(background);
  useEffect(() => {
    bgRef.current = background;
  }, [background]);
  const view = useRef({ yaw: 0, pitch: tilt, vYaw: 0, vPitch: 0, target: null as null | { yaw: number; pitch: number }, dragging: false });
  const playing = useRef(autoPlay);
  useEffect(() => {
    playing.current = autoPlay;
  }, [autoPlay]);

  // Turn the focused pin toward the viewer, a little right of centre so the
  // leader line has room.
  const aimAt = (pin: Pin | undefined) => {
    if (!pin) return;
    view.current.target = { yaw: 22 - pin.lng, pitch: clamp(pin.lat * 0.75, -35, 45) };
  };
  useEffect(() => {
    aimAt(pins[focus]);
    // Only a change of focus re-aims; editing a pin's text shouldn't spin the globe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let prev = performance.now();
    let sinceStep = 0;
    let panelY = -1;
    const started = performance.now();
    const BUCKETS = 10;

    const project = (lat: number, lng: number, yaw: number, pitch: number) => {
      const c = Math.cos(lat * D2R);
      const a = (lng + yaw) * D2R;
      const x = c * Math.sin(a);
      const y = Math.sin(lat * D2R);
      const z = c * Math.cos(a);
      const p = pitch * D2R;
      return { x, y: y * Math.cos(p) - z * Math.sin(p), z: y * Math.sin(p) + z * Math.cos(p) };
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const L = live.current;
      const lay = L.layout;
      const v = view.current;
      if (!lay) {
        raf = requestAnimationFrame(tick);
        return;
      }

      if (playing.current && L.pins.length > 1) {
        sinceStep += dt;
        if (sinceStep > 4.5) {
          sinceStep = 0;
          setFocus((f) => (f + 1) % L.pins.length);
        }
      }

      // Rotation: dragged directly, eased toward a focused pin, or drifting.
      if (!v.dragging) {
        if (v.target) {
          const k = 1 - Math.exp(-dt * 3.2);
          const dy = wrapAngle(v.target.yaw - v.yaw);
          v.yaw += dy * k;
          v.pitch += (v.target.pitch - v.pitch) * k;
          if (Math.abs(dy) < 0.05 && Math.abs(v.target.pitch - v.pitch) < 0.05) v.target = null;
        } else if (Math.abs(v.vYaw) > 0.5 || Math.abs(v.vPitch) > 0.5) {
          v.yaw += v.vYaw * dt;
          v.pitch = clamp(v.pitch + v.vPitch * dt, -60, 60);
          const decay = Math.exp(-dt * 2.5);
          v.vYaw *= decay;
          v.vPitch *= decay;
        } else {
          v.yaw += L.spin * dt;
          v.pitch += (L.tilt - v.pitch) * (1 - Math.exp(-dt * 0.8));
        }
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = lay.w;
      const H = lay.h;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const { cx, cy, r, u } = lay;
      const [gr, gg, gb] = hexRgb(L.globeColor);

      // Soft halo behind the sphere
      const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.25);
      halo.addColorStop(0, `rgba(${gr},${gg},${gb},0.12)`);
      halo.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
      // The sea stays as dark as the page; the halo only shows outside the rim.
      ctx.fillStyle = bgRef.current;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Land dots, batched into a few brightness buckets so the fill colour
      // changes a handful of times per frame instead of once per dot.
      const yawR = v.yaw * D2R;
      const pR = v.pitch * D2R;
      const sy = Math.sin(yawR);
      const cyw = Math.cos(yawR);
      const sp = Math.sin(pR);
      const cp = Math.cos(pR);
      const lx = 0.55;
      const ly = 0.4;
      const lz = 0.73;
      const paths = Array.from({ length: BUCKETS }, () => new Path2D());
      const d = L.dots;
      const dotSize = Math.max(1, r * 0.0088);
      for (let i = 0; i < d.length; i += 3) {
        const x0 = d[i];
        const y0 = d[i + 1];
        const z0 = d[i + 2];
        const x = x0 * cyw + z0 * sy;
        const z1 = -x0 * sy + z0 * cyw;
        const z = y0 * sp + z1 * cp;
        if (z <= 0.02) continue;
        const y = y0 * cp - z1 * sp;
        const light = Math.max(0, x * lx + y * ly + z * lz);
        const b = Math.min(BUCKETS - 1, Math.floor((0.25 + 0.75 * light) * BUCKETS));
        const s = dotSize * (0.55 + 0.45 * z);
        paths[b].rect(cx + x * r - s / 2, cy - y * r - s / 2, s, s);
      }
      for (let b = 0; b < BUCKETS; b++) {
        const t = (b + 1) / BUCKETS;
        ctx.fillStyle = `rgba(${gr},${gg},${gb},${0.25 + 0.75 * t})`;
        ctx.fill(paths[b]);
      }

      // Rim light: a bright crescent on the lit side, a faint one opposite.
      ctx.save();
      ctx.lineWidth = Math.max(1.5, r * 0.022);
      ctx.shadowColor = `rgba(${gr},${gg},${gb},0.9)`;
      ctx.shadowBlur = r * 0.08;
      const rim = ctx.createLinearGradient(cx - r, cy + r, cx + r, cy - r);
      rim.addColorStop(0, `rgba(${gr},${gg},${gb},0.35)`);
      rim.addColorStop(0.35, `rgba(${gr},${gg},${gb},0)`);
      rim.addColorStop(0.62, `rgba(${gr},${gg},${gb},0)`);
      rim.addColorStop(0.82, "rgba(255,255,255,0.55)");
      rim.addColorStop(1, "rgba(255,255,255,0.95)");
      ctx.strokeStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Pins, back to front so nearer rings overlap farther ones.
      const t = (now - started) / 1000;
      const projected = L.pins.map((pin, i) => {
        const q = project(pin.lat, pin.lng, v.yaw, v.pitch);
        return { i, sx: cx + q.x * r, sy: cy - q.y * r, z: q.z, alpha: clamp((q.z + 0.05) / 0.2, 0, 1) };
      });
      pinScreen.current = projected;
      const order = [...projected].sort((a, b) => a.z - b.z);
      for (const p of order) {
        if (p.alpha <= 0) continue;
        const active = p.i === L.focus;
        ctx.globalAlpha = p.alpha;
        if (active) {
          const phase = (t % 2) / 2;
          ctx.strokeStyle = rgba(L.accentColor, (1 - phase) * 0.55);
          ctx.lineWidth = 2 * u;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, (17 + phase * 22) * u, 0, Math.PI * 2);
          ctx.stroke();
        }
        const outer = (active ? 17 : 11) * u;
        const ring = (active ? 9 : 5.5) * u;
        ctx.fillStyle = active ? L.accentColor : L.pinColor;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, outer, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#151515";
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, outer - ring, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Leader line and bracket for the focused pin
      const panel = panelRef.current;
      const fp = projected[L.focus];
      if (panel) {
        const ph = panel.offsetHeight;
        const show = fp ? fp.alpha : 0;
        const wantY = lay.narrow ? lay.orbitY + 60 * u + ph / 2 : clamp(fp ? fp.sy : lay.cy, ph / 2 + 40 * u, H - ph / 2 - 150 * u);
        panelY = panelY < 0 ? wantY : panelY + (wantY - panelY) * (1 - Math.exp(-dt * 6));
        panel.style.transform = `translate(${lay.bracketX + (lay.narrow ? 20 : 70) * u}px, ${panelY - ph / 2}px)`;
        panel.style.opacity = String(lay.narrow ? 1 : 0.25 + 0.75 * show);
        const top = panelY - ph / 2 - 26 * u;
        const bottom = panelY + ph / 2 + 26 * u;
        ctx.strokeStyle = rgba(L.textColor, 0.35);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lay.bracketX + 40 * u, top);
        ctx.lineTo(lay.bracketX, top);
        ctx.lineTo(lay.bracketX, bottom);
        ctx.lineTo(lay.bracketX + 40 * u, bottom);
        ctx.stroke();
        if (fp && show > 0 && !lay.narrow) {
          const ly2 = clamp(fp.sy, top, bottom);
          ctx.globalAlpha = show;
          ctx.beginPath();
          ctx.moveTo(fp.sx + 17 * u, fp.sy);
          ctx.lineTo(lay.bracketX - 40 * u, fp.sy);
          ctx.lineTo(lay.bracketX, ly2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Rotation indicator: a dashed orbit with a dot that tracks the spin.
      const ex = cx;
      const ey = lay.orbitY;
      const erx = Math.max(40, r * 0.3);
      const ery = erx * 0.22;
      ctx.strokeStyle = rgba(L.textColor, 0.45);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = L.accentColor;
      ctx.beginPath();
      ctx.arc(ex + Math.sin(-yawR) * erx, ey + Math.cos(yawR) * ery, 4.5 * u, 0, Math.PI * 2);
      ctx.fill();

      // Figures count up once on mount.
      const e = clamp((now - started) / 1600, 0, 1);
      const ease = 1 - Math.pow(1 - e, 3);
      L.statValues.forEach((s, i) => {
        const el = statRefs.current[i];
        if (el && Number.isFinite(s.value)) el.textContent = String(Math.round(s.value * ease));
      });

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!layout) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const o = orbitAngle(layout, x, y);
    const onOrbit = Math.abs(o.nx) < 1.35 && Math.abs(o.ny) < 2.6;
    if (!onOrbit && Math.hypot(x - layout.cx, y - layout.cy) > layout.r * 1.08) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured; dragging still works.
    }
    drag.current = { x, y, lx: x, ly: y, lt: performance.now(), moved: false, orbit: onOrbit };
    view.current.dragging = true;
    view.current.target = null;
    view.current.vYaw = 0;
    view.current.vPitch = 0;
    playing.current = false;
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d || !layout) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (Math.hypot(x - d.x, y - d.y) > 5) d.moved = true;
    const degPerPx = 90 / layout.r;
    const v = view.current;
    const now = performance.now();
    const dtm = Math.max(1, now - d.lt) / 1000;
    // On the globe, the surface follows the pointer. On the orbit, the dot
    // follows it around the ellipse and the globe turns to match.
    const dYaw = d.orbit ? wrapAngle(orbitAngle(layout, x, y).angle - orbitAngle(layout, d.lx, d.ly).angle) : (x - d.lx) * degPerPx;
    const dPitch = d.orbit ? 0 : (y - d.ly) * degPerPx;
    v.yaw += dYaw;
    v.pitch = clamp(v.pitch + dPitch, -60, 60);
    v.vYaw = dYaw / dtm;
    v.vPitch = dPitch / dtm;
    d.lx = x;
    d.ly = y;
    d.lt = now;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    view.current.dragging = false;
    if (!d || d.moved || d.orbit || !layout) {
      if (d && performance.now() - d.lt > 80) {
        view.current.vYaw = 0;
        view.current.vPitch = 0;
      }
      return;
    }
    view.current.vYaw = 0;
    view.current.vPitch = 0;
    // A tap: focus the pin under it, or drop a new one.
    const hit = pinScreen.current
      .filter((p) => p.alpha > 0.5 && Math.hypot(p.sx - d.x, p.sy - d.y) < 20 * layout.u)
      .sort((a, b) => b.z - a.z)[0];
    if (hit) {
      setFocus(hit.i);
      if (hit.i === focus) aimAt(pins[hit.i]);
      return;
    }
    if (!clickToPin) return;
    const px = (d.x - layout.cx) / layout.r;
    const py = -(d.y - layout.cy) / layout.r;
    const rr = px * px + py * py;
    if (rr >= 1) return;
    const pz = Math.sqrt(1 - rr);
    const p = view.current.pitch * D2R;
    const y0 = py * Math.cos(p) + pz * Math.sin(p);
    const z0 = -py * Math.sin(p) + pz * Math.cos(p);
    const lat = Math.asin(clamp(y0, -1, 1)) / D2R;
    const lng = wrapAngle(Math.atan2(px, z0) / D2R - view.current.yaw);
    const ns = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}`;
    const ew = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? "E" : "W"}`;
    const next = [...dropped, { name: `Pin ${dropped.length + 1}`, lat, lng, details: [`${ns}, ${ew}`, "Added on the globe"] }];
    setDropped(next);
    setFocus(configured.length + next.length - 1);
    e.preventDefault();
  };

  const u = layout?.u ?? 1;
  const fs = (textScale / 100) * u;
  const current = pins[focus];

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden select-none" style={{ background, fontFamily, color: textColor }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ cursor: "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {layout && (
        <>
          <div
            ref={panelRef}
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: Math.min(300 * u, layout.w - layout.bracketX - 90 * u), willChange: "transform" }}
          >
            {current && (
              <div key={`${focus}-${current.name}`} style={{ animation: "globePanelIn 420ms ease-out both" }}>
                <div style={{ fontSize: 23 * fs, fontWeight: 600, lineHeight: 1.2 }}>{current.name}</div>
                {current.details[0] && (
                  <div style={{ marginTop: 26 * fs, fontSize: 16 * fs, fontWeight: 600, lineHeight: 1.35 }}>{current.details[0]}</div>
                )}
                {current.details.length > 1 && (
                  <div style={{ marginTop: 16 * fs, fontSize: 15.5 * fs, lineHeight: 1.4, color: rgba(textColor, 0.38) }}>
                    {current.details.slice(1).map((line, i) => (
                      <div key={i} className="truncate">{line}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div
            className="pointer-events-none absolute -translate-x-1/2 text-center"
            style={{ left: layout.cx, top: layout.orbitY + Math.max(40, layout.r * 0.3) * 0.22 + 18 * u, fontSize: 12 * fs, color: rgba(textColor, 0.4) }}
          >
            {hint}
          </div>

          {statValues.length > 0 && (
            <div
              className="pointer-events-none absolute"
              style={{
                right: layout.narrow ? 24 : layout.w * 0.04,
                bottom: layout.h * 0.07,
                width: layout.narrow ? layout.w - 48 : Math.min(400 * u, layout.w * 0.33),
              }}
            >
              <div style={{ height: 10 * u, borderTop: `1px solid ${rgba(textColor, 0.4)}`, borderLeft: `1px solid ${rgba(textColor, 0.4)}`, borderRight: `1px solid ${rgba(textColor, 0.4)}` }} />
              <div className="grid" style={{ gridTemplateColumns: `repeat(${statValues.length}, 1fr)` }}>
                {statValues.map((s, i) => (
                  <div key={i} style={{ paddingLeft: 14 * u, borderLeft: i ? `1px solid ${rgba(textColor, 0.3)}` : undefined, marginTop: -2 * u }}>
                    <span ref={(el) => { statRefs.current[i] = el; }} style={{ display: "block", fontSize: 34 * fs, lineHeight: 1.1 }}>
                      {Number.isFinite(s.value) ? "0" : ""}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${statValues.length}, 1fr)`, marginTop: 36 * u }}>
                {statValues.map((s, i) => (
                  <div
                    key={i}
                    className="truncate text-right"
                    style={{ paddingRight: 10 * u, borderRight: `1px solid ${rgba(textColor, 0.3)}`, fontSize: 13.5 * fs, color: rgba(textColor, 0.45) }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
              <div style={{ height: 10 * u, marginTop: 8 * u, borderBottom: `1px solid ${rgba(textColor, 0.4)}`, borderLeft: `1px solid ${rgba(textColor, 0.4)}`, borderRight: `1px solid ${rgba(textColor, 0.4)}` }} />
            </div>
          )}
        </>
      )}
      <style>{`@keyframes globePanelIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
