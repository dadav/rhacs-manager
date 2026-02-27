"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutModalBox = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const about_modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/AboutModalBox/about-modal-box"));
const AboutModalBox = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBox, className) }, props, { children: children })));
};
exports.AboutModalBox = AboutModalBox;
exports.AboutModalBox.displayName = 'AboutModalBox';
//# sourceMappingURL=AboutModalBox.js.map