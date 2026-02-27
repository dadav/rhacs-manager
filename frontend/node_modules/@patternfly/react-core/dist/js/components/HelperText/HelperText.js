"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelperText = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const helper_text_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/HelperText/helper-text"));
const react_styles_1 = require("@patternfly/react-styles");
const HelperText = (_a) => {
    var { children, className, component = 'div', id, isLiveRegion = false, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "component", "id", "isLiveRegion", 'aria-label']);
    const Component = component;
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({ id: id, className: (0, react_styles_1.css)(helper_text_1.default.helperText, className) }, (isLiveRegion && { 'aria-live': 'polite' }), (component === 'ul' && { role: 'list', 'aria-label': ariaLabel }), props, { children: children })));
};
exports.HelperText = HelperText;
exports.HelperText.displayName = 'HelperText';
//# sourceMappingURL=HelperText.js.map