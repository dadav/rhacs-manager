"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ModalBox/modal-box"));
const ModalBoxDescription_1 = require("./ModalBoxDescription");
const ModalBoxTitle_1 = require("./ModalBoxTitle");
const ModalHeader = (_a) => {
    var { children, className, descriptorId, description, labelId, title, titleIconVariant, titleScreenReaderText, help } = _a, props = tslib_1.__rest(_a, ["children", "className", "descriptorId", "description", "labelId", "title", "titleIconVariant", "titleScreenReaderText", "help"]);
    const headerContent = children ? (children) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(ModalBoxTitle_1.ModalBoxTitle, { title: title, titleIconVariant: titleIconVariant, titleScreenReaderText: titleScreenReaderText, id: labelId }), description && (0, jsx_runtime_1.jsx)(ModalBoxDescription_1.ModalBoxDescription, { id: descriptorId, children: description })] }));
    return ((0, jsx_runtime_1.jsxs)("header", Object.assign({ className: (0, react_styles_1.css)(modal_box_1.default.modalBoxHeader, help && modal_box_1.default.modifiers.help, className) }, props, { children: [help && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(modal_box_1.default.modalBoxHeaderMain), children: headerContent }), (0, jsx_runtime_1.jsx)("div", { className: `${modal_box_1.default.modalBoxHeader}-help`, children: help })] })), !help && headerContent] })));
};
exports.ModalHeader = ModalHeader;
exports.ModalHeader.displayName = 'ModalHeader';
//# sourceMappingURL=ModalHeader.js.map