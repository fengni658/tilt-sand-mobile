# Implementation reference

Reviewed 2026-10-26:
- https://github.com/abcdmku/PixelTilt/blob/master/LICENSE
- https://github.com/abcdmku/PixelTilt/blob/master/games/sand/game.cpp
- https://github.com/abcdmku/PixelTilt/blob/master/games/sand2/game.cpp

Upstream SAND uses a 64×64 cell field with gravity-directed traversal and candidate moves. SANDII uses 1,024 continuous particles, position-based contact constraints, spatial buckets, half-neighborhood pair visits, friction, and occupancy correction. Firmware includes additional input, audio and themed behaviors not used here.

This web implementation was independently written using the general cellular-sand idea, one-cell occupancy and gravity-directed ordering. It uses persistent particle IDs, a seeded RNG, arbitrary-vector projection ordering, and browser-specific input/lifecycle handling. It does not reproduce SANDII's continuous dynamics, shake impulses, rotating-frame forces or exact visual response. Upstream license is retained conservatively for the algorithm reference. No source C++ or third-party assets are bundled in the application.
