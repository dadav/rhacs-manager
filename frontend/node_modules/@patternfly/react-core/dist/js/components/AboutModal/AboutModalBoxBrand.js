"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutModalBoxBrand = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const about_modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/AboutModalBox/about-modal-box"));
const AboutModalBoxBrand = (_a) => {
    var { src, alt } = _a, props = tslib_1.__rest(_a, ["src", "alt"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBoxBrand) }, props, { children: (0, jsx_runtime_1.jsx)("img", { className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBoxBrandImage), src: src, alt: alt }) })));
};
exports.AboutModalBoxBrand = AboutModalBoxBrand;
exports.AboutModalBoxBrand.displayName = 'AboutModalBoxBrand';
//# sourceMappingURL=AboutModalBoxBrand.js.map