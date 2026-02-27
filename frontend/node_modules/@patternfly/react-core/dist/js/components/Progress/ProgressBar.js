"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressBar = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const progress_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Progress/progress"));
const react_styles_1 = require("@patternfly/react-styles");
const ProgressBar = (_a) => {
    var { progressBarAriaProps, className = '', children = null, value } = _a, props = tslib_1.__rest(_a, ["progressBarAriaProps", "className", "children", "value"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ role: "progressbar" }, props, { className: (0, react_styles_1.css)(progress_1.default.progressBar, className) }, progressBarAriaProps, { children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(progress_1.default.progressIndicator), style: { width: `${value}%` }, children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(progress_1.default.progressMeasure), children: children }) }) })));
};
exports.ProgressBar = ProgressBar;
exports.ProgressBar.displayName = 'ProgressBar';
//# sourceMappingURL=ProgressBar.js.map