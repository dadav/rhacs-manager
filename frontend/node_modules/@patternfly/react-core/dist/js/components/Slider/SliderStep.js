"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SliderStep = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const slider_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Slider/slider"));
const react_styles_1 = require("@patternfly/react-styles");
const c_slider__step_InsetInlineStart_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_slider__step_InsetInlineStart'));
const SliderStep = (_a) => {
    var { className, label, value, isTickHidden = false, isLabelHidden = false, isActive = false } = _a, props = tslib_1.__rest(_a, ["className", "label", "value", "isTickHidden", "isLabelHidden", "isActive"]);
    const style = {
        [c_slider__step_InsetInlineStart_1.default.name]: `${value ? value : c_slider__step_InsetInlineStart_1.default.value}%`
    };
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(slider_1.default.sliderStep, isActive && slider_1.default.modifiers.active, className), style: style }, props, { children: [!isTickHidden && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(slider_1.default.sliderStepTick) }), !isLabelHidden && label && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(slider_1.default.sliderStepLabel), children: label })] })));
};
exports.SliderStep = SliderStep;
exports.SliderStep.displayName = 'SliderStep';
//# sourceMappingURL=SliderStep.js.map