"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressStepper = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const progress_stepper_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ProgressStepper/progress-stepper"));
const react_styles_1 = require("@patternfly/react-styles");
const ProgressStepper = (_a) => {
    var { children, className, isCenterAligned, isVertical, isCompact, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "isCenterAligned", "isVertical", "isCompact", 'aria-label']);
    return ((0, jsx_runtime_1.jsx)("ol", Object.assign({ className: (0, react_styles_1.css)(progress_stepper_1.default.progressStepper, isCenterAligned && progress_stepper_1.default.modifiers.center, isVertical && progress_stepper_1.default.modifiers.vertical, isCompact && progress_stepper_1.default.modifiers.compact, className), role: "list", "aria-label": ariaLabel }, props, { children: children })));
};
exports.ProgressStepper = ProgressStepper;
exports.ProgressStepper.displayName = 'ProgressStepper';
//# sourceMappingURL=ProgressStepper.js.map