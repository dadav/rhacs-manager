"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hamburgerIcon = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const button_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Button/button"));
const react_styles_1 = require("@patternfly/react-styles");
// Because this is such a specific icon that requires being wrapped in a pf-v[current version]-c-button element,
// we don't want to export this to consumers nor include it in the react-icons package as a custom icon.
exports.hamburgerIcon = ((0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 10 10", className: (0, react_styles_1.css)(button_1.default.buttonHamburgerIcon, 'pf-v6-svg'), width: "1em", height: "1em", children: [(0, jsx_runtime_1.jsx)("path", { className: (0, react_styles_1.css)(button_1.default.buttonHamburgerIconTop), d: "M1,1 L9,1" }), (0, jsx_runtime_1.jsx)("path", { className: (0, react_styles_1.css)(button_1.default.buttonHamburgerIconMiddle), d: "M1,5 L9,5" }), (0, jsx_runtime_1.jsx)("path", { className: (0, react_styles_1.css)(button_1.default.buttonHamburgerIconArrow), d: "M1,5 L1,5 L1,5" }), (0, jsx_runtime_1.jsx)("path", { className: (0, react_styles_1.css)(button_1.default.buttonHamburgerIconBottom), d: "M9,9 L1,9" })] }));
//# sourceMappingURL=hamburgerIcon.js.map