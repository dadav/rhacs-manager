"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutModalBoxCloseButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const about_modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/AboutModalBox/about-modal-box"));
const Button_1 = require("../Button");
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const AboutModalBoxCloseButton = (_a) => {
    var { onClose = (_e) => undefined, 'aria-label': ariaLabel = 'Close Dialog' } = _a, props = tslib_1.__rest(_a, ["onClose", 'aria-label']);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(about_modal_box_1.default.aboutModalBoxClose) }, props, { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", onClick: onClose, "aria-label": ariaLabel, icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }) })));
};
exports.AboutModalBoxCloseButton = AboutModalBoxCloseButton;
exports.AboutModalBoxCloseButton.displayName = 'AboutModalBoxCloseButton';
//# sourceMappingURL=AboutModalBoxCloseButton.js.map