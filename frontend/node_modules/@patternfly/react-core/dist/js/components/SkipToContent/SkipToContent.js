"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipToContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const skip_to_content_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/SkipToContent/skip-to-content"));
const react_styles_1 = require("@patternfly/react-styles");
const Button_1 = require("../Button");
const SkipToContent = (_a) => {
    var { children = null, className = '', href } = _a, props = tslib_1.__rest(_a, ["children", "className", "href"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(skip_to_content_1.default.skipToContent, className) }, props, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.primary, component: "a", href: href, children: children }) })));
};
exports.SkipToContent = SkipToContent;
exports.SkipToContent.displayName = 'SkipToContent';
//# sourceMappingURL=SkipToContent.js.map