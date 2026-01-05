export interface WheelConfig {
  activityId: string;
  pathMatch: string;
  resultElementIds: string[];
  requiresPrizeName?: boolean;
}

const COMMON_RESULT_ELEMENTS = [
  "wheelPrizePopup",
  "responseDisplaySuccess",
  "responseDisplayFail",
];

export const WHEEL_CONFIGS: WheelConfig[] = [
  {
    activityId: "wheel_of_mediocrity",
    pathMatch: "mediocrity.phtml",
    resultElementIds: COMMON_RESULT_ELEMENTS,
  },
  {
    activityId: "wheel_of_excitement",
    pathMatch: "faerieland/wheel.phtml",
    resultElementIds: [
      ...COMMON_RESULT_ELEMENTS,
      "wheelDonePopup",
      "watchAdButtonContainer",
    ],
  },
  {
    activityId: "wheel_of_knowledge",
    pathMatch: "knowledge.phtml",
    resultElementIds: COMMON_RESULT_ELEMENTS,
  },
  {
    activityId: "wheel_of_misfortune",
    pathMatch: "halloween/wheel",
    resultElementIds: COMMON_RESULT_ELEMENTS,
  },
  {
    activityId: "wheel_of_monotony",
    pathMatch: "monotony.phtml",
    resultElementIds: COMMON_RESULT_ELEMENTS,
  },
  {
    activityId: "wheel_of_extravagance",
    pathMatch: "extravagance.phtml",
    resultElementIds: ["wheelPrizePopup"],
    requiresPrizeName: true,
  },
];
