// Every shader program the atmosphere builds, as [name, vertex, fragment]:
// what `npm run devices` compiles and links on real phones. A new pass goes
// here in the same push (the unit test fails on any shader left out).
import { FRAGMENT, VERTEX } from '../../components/gradient/gl/mistShader.js';
import { CREST_FRAGMENT, CREST_VERTEX } from '../../components/gradient/gl/crestShader.js';
import { GRASS_FRAGMENT, GRASS_VERTEX } from '../../components/gradient/gl/grassShader.js';
import { FLOWER_FRAGMENT, FLOWER_VERTEX } from '../../components/gradient/gl/flowerShader.js';
import { TREE_FRAGMENT, TREE_VERTEX } from '../../components/gradient/gl/treeShader.js';
import { DESK_FRAGMENT, DESK_VERTEX } from '../../components/gradient/gl/deskShader.js';
import { LAPTOP_FRAGMENT, LAPTOP_VERTEX } from '../../components/gradient/gl/laptopShader.js';
import { TABLET_FRAGMENT, TABLET_VERTEX } from '../../components/gradient/gl/tabletShader.js';
import { LAMP_FRAGMENT, LAMP_VERTEX } from '../../components/gradient/gl/lampShader.js';
import { MEADOW_FLOWERS, MEADOW_FOOT, MEADOW_PAINT, MEADOW_VERTEX } from '../../components/gradient/gl/meadowShader.js';

export const PROGRAMS = [
  ['scene', VERTEX, FRAGMENT],
  ['crest', CREST_VERTEX, CREST_FRAGMENT],
  ['grass', GRASS_VERTEX, GRASS_FRAGMENT],
  ['flowers', FLOWER_VERTEX, FLOWER_FRAGMENT],
  ['trees', TREE_VERTEX, TREE_FRAGMENT],
  ['desk', DESK_VERTEX, DESK_FRAGMENT],
  ['laptop', LAPTOP_VERTEX, LAPTOP_FRAGMENT],
  ['tablet', TABLET_VERTEX, TABLET_FRAGMENT],
  ['lamp', LAMP_VERTEX, LAMP_FRAGMENT],
  ['meadow paint', MEADOW_VERTEX, MEADOW_PAINT],
  ['painted flowers', MEADOW_VERTEX, MEADOW_FLOWERS],
  ['foot mist', MEADOW_VERTEX, MEADOW_FOOT],
];
