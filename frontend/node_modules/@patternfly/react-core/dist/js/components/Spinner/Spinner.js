"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spinner = exports.spinnerSize = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const spinner_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Spinner/spinner"));
const react_styles_1 = require("@patternfly/react-styles");
const c_spinner_diameter_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_spinner_diameter'));
var spinnerSize;
(function (spinnerSize) {
    spinnerSize["sm"] = "sm";
    spinnerSize["md"] = "md";
    spinnerSize["lg"] = "lg";
    spinnerSize["xl"] = "xl";
})(spinnerSize || (exports.spinnerSize = spinnerSize = {}));
const Spinner = (_a) => {
    var { className = '', size = 'xl', 'aria-valuetext': ariaValueText = 'Loading...', diameter, isInline = false, 'aria-label': ariaLabel, 'aria-labelledBy': ariaLabelledBy } = _a, props = tslib_1.__rest(_a, ["className", "size", 'aria-valuetext', "diameter", "isInline", 'aria-label', 'aria-labelledBy']);
    return ((0, jsx_runtime_1.jsx)("svg", Object.assign({ className: (0, react_styles_1.css)(spinner_1.default.spinner, isInline ? spinner_1.default.modifiers.inline : spinner_1.default.modifiers[size], className), role: "progressbar", "aria-valuetext": ariaValueText, viewBox: "0 0 100 100" }, (diameter && { style: { [c_spinner_diameter_1.default.name]: diameter } }), (ariaLabel && { 'aria-label': ariaLabel }), (ariaLabelledBy && { 'aria-labelledBy': ariaLabelledBy }), (!ariaLabel && !ariaLabelledBy && { 'aria-label': 'Contents' }), props, { children: (0, jsx_runtime_1.jsx)("circle", { className: spinner_1.default.spinnerPath, cx: "50", cy: "50", r: "45", fill: "none" }) })));
};
exports.Spinner = Spinner;
exports.Spinner.displayName = 'Spinner';
//# sourceMappingURL=Spinner.js.map