# GANDOM REAL CELL GEOMETRY CONTRACT

NODE_GRID = 20 x 20 x 50 = 20,000 nodes

CELL_GRID_PER_NODE = 100 x 100 x 40 = 400,000 cells

GLOBAL_GRID = 2000 x 2000 x 2000 = 8,000,000,000 cells

For node (a,b,c):
0 <= a < 20
0 <= b < 20
0 <= c < 50

For local cell (i,j,k):
0 <= i < 100
0 <= j < 100
0 <= k < 40

Global coordinate:
X = 100*a + i
Y = 100*b + j
Z = 40*c + k

Cell identity:
G = ((X * 2000) + Y) * 2000 + Z

Neighbour model:
6-connected Cartesian neighbourhood.

DHT_K=20 is the overlay routing parameter.
It is NOT the cell-neighbour count.

A cell is not considered LIVE merely because it is counted.
LIVE requires:
1. allocated state
2. valid coordinate
3. valid neighbour relation
4. executed state transition
5. heartbeat/epoch
6. verifiable state digest

FAKE_PASS = BLOCKED
