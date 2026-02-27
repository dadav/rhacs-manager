"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalBoxHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ModalBox/modal-box"));
const ModalBoxHeader = (_a) => {
    var { children = null, className = '', help = null } = _a, props = tslib_1.__rest(_a, ["children", "className", "help"]);
    return ((0, jsx_runtime_1.jsxs)("header", Object.assign({ className: (0, react_styles_1.css)(modal_box_1.default.modalBoxHeader, help && modal_box_1.default.modifiers.help, className) }, props, { children: [help && ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(modal_box_1.default.modalBoxHeaderMain), children: children }), (0, jsx_runtime_1.jsx)("div", { className: `${modal_box_1.default.modalBoxHeader}-help`, children: help })] })), !help && children] })));
};
exports.ModalBoxHeader = ModalBoxHeader;
exports.ModalBoxHeader.displayName = 'ModalBoxHeader';
//# sourceMappingURL=ModalBoxHeader.js.map