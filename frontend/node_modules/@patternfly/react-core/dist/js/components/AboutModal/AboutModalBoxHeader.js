"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutModalBoxHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const about_modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/AboutModalBox/about-modal-box"));
const Title_1 = require("../Title");
const AboutModalBoxHeader = (_a) => {
    var { productName, id } = _a, props = tslib_1.__rest(_a, ["productName", "id"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBoxHeader) }, props, { children: (0, jsx_runtime_1.jsx)(Title_1.Title, { headingLevel: "h1", size: "4xl", id: id, children: productName }) })));
};
exports.AboutModalBoxHeader = AboutModalBoxHeader;
exports.AboutModalBoxHeader.displayName = 'AboutModalBoxHeader';
//# sourceMappingURL=AboutModalBoxHeader.js.map