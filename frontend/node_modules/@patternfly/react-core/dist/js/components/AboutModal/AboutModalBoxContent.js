"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutModalBoxContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const about_modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/AboutModalBox/about-modal-box"));
const content_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Content/content"));
const AboutModalBoxContent = (_a) => {
    var { children, trademark, hasNoContentContainer = false } = _a, props = tslib_1.__rest(_a, ["children", "trademark", "hasNoContentContainer"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBoxContent) }, props, { children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(`${about_modal_box_1.default.aboutModalBox}__body`), children: hasNoContentContainer ? children : (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(content_1.default.content), children: children }) }), (0, jsx_runtime_1.jsx)("p", { className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBoxStrapline), children: trademark })] })));
};
exports.AboutModalBoxContent = AboutModalBoxContent;
exports.AboutModalBoxContent.displayName = 'AboutModalBoxContent';
//# sourceMappingURL=AboutModalBoxContent.js.map