export type LegGeometry = {
  thighLength: number;
  shinLength: number;
  footHeight: number;
};

export const FOOT_BOX_HEIGHT = 0.06;

export const RIG_GEOMETRY: LegGeometry = {
  thighLength: 0.31,
  shinLength: 0.31,
  footHeight: 0,
};

export const REST_FOOT_Y = -(
  RIG_GEOMETRY.thighLength
  + RIG_GEOMETRY.shinLength
  + RIG_GEOMETRY.footHeight
);
