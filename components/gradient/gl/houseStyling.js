/**
 * (0.4.31) The house styling version: defaults to '0.4.31' (the lived-in
 * styling pass). When set to '0.4.28', the house renders without the 0.4.31
 * additions, allowing direct A/B comparison in /house.
 */

let currentStyling = '0.4.31';

export const getStylingPass = () => currentStyling;

export const setStylingPass = pass => {
  currentStyling = pass === '0.4.28' ? '0.4.28' : '0.4.31';
};

export const isLivedIn = () => currentStyling === '0.4.31';
