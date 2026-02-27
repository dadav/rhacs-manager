"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastheadBrand = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const masthead_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Masthead/masthead"));
const react_styles_1 = require("@patternfly/react-styles");
const MastheadBrand = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(masthead_1.default.mastheadBrand, className) }, props, { children: children })));
};
exports.MastheadBrand = MastheadBrand;
exports.MastheadBrand.displayName = 'MastheadBrand';
//# sourceMappingURL=MastheadBrand.js.map