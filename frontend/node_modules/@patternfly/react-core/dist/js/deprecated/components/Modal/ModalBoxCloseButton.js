"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalBoxCloseButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ModalBox/modal-box"));
const Button_1 = require("../../../components/Button");
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const ModalBoxCloseButton = (_a) => {
    var { className, onClose = () => undefined, 'aria-label': ariaLabel = 'Close', ouiaId } = _a, props = tslib_1.__rest(_a, ["className", "onClose", 'aria-label', "ouiaId"]);
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(modal_box_1.default.modalBoxClose, className), children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: "plain", onClick: (event) => onClose(event), "aria-label": ariaLabel }, (ouiaId && { ouiaId: `${ouiaId}-${exports.ModalBoxCloseButton.displayName}` }), props, { icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) })) }));
};
exports.ModalBoxCloseButton = ModalBoxCloseButton;
exports.ModalBoxCloseButton.displayName = 'ModalBoxCloseButton';
//# sourceMappingURL=ModalBoxCloseButton.js.map