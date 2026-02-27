"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalBoxDescription = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ModalBox/modal-box"));
const ModalBoxDescription = (_a) => {
    var { children = null, className = '', id = '' } = _a, props = tslib_1.__rest(_a, ["children", "className", "id"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { id: id, className: (0, react_styles_1.css)(modal_box_1.default.modalBoxDescription, className), children: children })));
};
exports.ModalBoxDescription = ModalBoxDescription;
exports.ModalBoxDescription.displayName = 'ModalBoxDescription';
//# sourceMappingURL=ModalBoxDescription.js.map