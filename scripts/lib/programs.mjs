// Every shader program the atmosphere builds, as [name, vertex, fragment]:
// what `npm run devices` compiles and links on real phones. A new pass goes
// here in the same push (the unit test fails on any shader left out).
import { FRAGMENT, VERTEX } from '../../components/gradient/gl/mistShader.js';
import { CREST_FRAGMENT, CREST_VERTEX } from '../../components/gradient/gl/crestShader.js';
import { GRASS_FRAGMENT, GRASS_VERTEX } from '../../components/gradient/gl/grassShader.js';
import { FLOWER_FRAGMENT, FLOWER_VERTEX } from '../../components/gradient/gl/flowerShader.js';
import { TREE_FRAGMENT, TREE_OPAQUE_FRAGMENT, TREE_VERTEX } from '../../components/gradient/gl/treeShader.js';
import { DESK_FRAGMENT, DESK_VERTEX } from '../../components/gradient/gl/deskShader.js';
import { LAPTOP_FRAGMENT, LAPTOP_VERTEX } from '../../components/gradient/gl/laptopShader.js';
import { TABLET_FRAGMENT, TABLET_VERTEX } from '../../components/gradient/gl/tabletShader.js';
import { LAMP_FRAGMENT, LAMP_VERTEX } from '../../components/gradient/gl/lampShader.js';
import { HOUSE_DEPTH_FRAGMENT, HOUSE_DEPTH_SOLID_FRAGMENT, HOUSE_DEPTH_VERTEX, HOUSE_FRAGMENT, HOUSE_MIRROR_FRAGMENT, HOUSE_VERTEX } from '../../components/gradient/gl/houseShader.js';
import { WATER_PROGRAMS } from '../../components/gradient/gl/poolWater.js';
import { BLOOM_PROGRAMS } from '../../components/gradient/gl/bloom.js';
import { BIRD_FRAGMENT, BIRD_VERTEX } from '../../components/gradient/gl/birdShader.js';
import { SHADOW_FRAGMENT, SHADOW_VERTEX } from '../../components/gradient/gl/houseShadow.js';
import { LIGHTMAP_PROGRAMS } from '../../components/gradient/gl/houseLightmap.js';
import { GLASS_PANE_FRAGMENT, GLASS_PANE_VERTEX, GLASS_WATER_FRAGMENT, GLASS_WATER_VERTEX } from '../../components/gradient/gl/houseGlass.js';
import { PROBE_BACKDROP_FRAGMENT, PROBE_BACKDROP_VERTEX } from '../../components/gradient/gl/mirrorProbe.js';
import { PROPS_FRAGMENT, PROPS_VERTEX, STEAM_FRAGMENT, STEAM_VERTEX } from '../../components/gradient/gl/propsShader.js';
import { PEAKS_ALL_FS, PEAKS_BAKE_FS, PEAKS_COARSE_FS, PEAKS_CONSTS_FS, PEAKS_FAR_VS, PEAKS_FS, PEAKS_GEO_FS, PEAKS_HOR_FS, PEAKS_LIT_FS, PEAKS_MIX_FS, PEAKS_VS } from '../../components/gradient/gl/peaksShader.js';
import { MEADOW_FLOWERS, MEADOW_FLOWERS_FLAT, MEADOW_FOOT, MEADOW_LAWN_FRAGMENT, MEADOW_LAWN_VERTEX, MEADOW_PAINT, MEADOW_PAINT_FLAT, MEADOW_VERTEX } from '../../components/gradient/gl/meadowShader.js';

export const PROGRAMS = [
  ['scene', VERTEX, FRAGMENT],
  ['peaks-shape', PEAKS_VS, PEAKS_GEO_FS],
  ['peaks', PEAKS_VS, PEAKS_FS],
  ['peaks-coarse', PEAKS_VS, PEAKS_COARSE_FS],
  ['peaks-horizon', PEAKS_VS, PEAKS_HOR_FS],
  ['peaks-mix', PEAKS_VS, PEAKS_MIX_FS],
  ['peaks-lit', PEAKS_VS, PEAKS_LIT_FS],
  ['peaks-all', PEAKS_VS, PEAKS_ALL_FS],
  ['peaks-bake', PEAKS_VS, PEAKS_BAKE_FS],
  ['peaks-behind', PEAKS_FAR_VS, PEAKS_LIT_FS],
  ['peaks-shape-far', PEAKS_FAR_VS, PEAKS_GEO_FS],
  ['peaks-consts', PEAKS_VS, PEAKS_CONSTS_FS],
  ['crest', CREST_VERTEX, CREST_FRAGMENT],
  // (0.5.26, 0.5.28) Linked as the site does: vLive read back by transform feedback.
  ['grass', GRASS_VERTEX, GRASS_FRAGMENT, ['vLive']],
  ['flowers', FLOWER_VERTEX, FLOWER_FRAGMENT, ['vLive']],
  ['trees', TREE_VERTEX, TREE_FRAGMENT],
  ['trees-opaque', TREE_VERTEX, TREE_OPAQUE_FRAGMENT],
  ['desk', DESK_VERTEX, DESK_FRAGMENT],
  ['laptop', LAPTOP_VERTEX, LAPTOP_FRAGMENT],
  ['tablet', TABLET_VERTEX, TABLET_FRAGMENT],
  ['lamp', LAMP_VERTEX, LAMP_FRAGMENT],
  ['props', PROPS_VERTEX, PROPS_FRAGMENT],
  ['house', HOUSE_VERTEX, HOUSE_FRAGMENT],
  ['house-mirror', HOUSE_VERTEX, HOUSE_MIRROR_FRAGMENT],
  ['house-depth', HOUSE_DEPTH_VERTEX, HOUSE_DEPTH_FRAGMENT],
  ['house-depth-solid', HOUSE_DEPTH_VERTEX, HOUSE_DEPTH_SOLID_FRAGMENT],
  ['house-shadow', SHADOW_VERTEX, SHADOW_FRAGMENT],
  ...LIGHTMAP_PROGRAMS,
  ['house-glass-pane', GLASS_PANE_VERTEX, GLASS_PANE_FRAGMENT],
  ['house-glass-water', GLASS_WATER_VERTEX, GLASS_WATER_FRAGMENT],
  ['probe-backdrop', PROBE_BACKDROP_VERTEX, PROBE_BACKDROP_FRAGMENT],
  ...WATER_PROGRAMS,
  ...BLOOM_PROGRAMS,
  ['birds', BIRD_VERTEX, BIRD_FRAGMENT],
  ['steam', STEAM_VERTEX, STEAM_FRAGMENT],
  ['meadow paint', MEADOW_VERTEX, MEADOW_PAINT],
  ['meadow paint flat', MEADOW_VERTEX, MEADOW_PAINT_FLAT],
  ['meadow lawn', MEADOW_LAWN_VERTEX, MEADOW_LAWN_FRAGMENT],
  ['painted flowers', MEADOW_VERTEX, MEADOW_FLOWERS],
  ['painted flowers flat', MEADOW_VERTEX, MEADOW_FLOWERS_FLAT],
  ['foot mist', MEADOW_VERTEX, MEADOW_FOOT],
];
