"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ModalBox/modal-box"));
const ModalFooter = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("footer", Object.assign({}, props, { className: (0, react_styles_1.css)(modal_box_1.default.modalBoxFooter, className), children: children })));
};
exports.ModalFooter = ModalFooter;
exports.ModalFooter.displayName = 'ModalFooter';
//# sourceMappingURL=ModalFooter.js.map