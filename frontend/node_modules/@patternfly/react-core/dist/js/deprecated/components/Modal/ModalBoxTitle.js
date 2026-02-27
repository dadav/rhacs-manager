"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModalBoxTitle = exports.isVariantIcon = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const modal_box_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ModalBox/modal-box"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../../helpers");
const Tooltip_1 = require("../../../components/Tooltip");
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const exclamation_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-circle-icon'));
const exclamation_triangle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon'));
const info_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/info-circle-icon'));
const bell_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/bell-icon'));
const helpers_2 = require("../../../helpers");
const isVariantIcon = (icon) => ['success', 'danger', 'warning', 'info', 'custom'].includes(icon);
exports.isVariantIcon = isVariantIcon;
const ModalBoxTitle = (_a) => {
    var { className = '', id, title, titleIconVariant, titleLabel = '' } = _a, props = tslib_1.__rest(_a, ["className", "id", "title", "titleIconVariant", "titleLabel"]);
    const [hasTooltip, setHasTooltip] = (0, react_1.useState)(false);
    const h1 = (0, react_1.useRef)(null);
    const label = titleLabel || ((0, exports.isVariantIcon)(titleIconVariant) ? `${(0, helpers_1.capitalize)(titleIconVariant)} alert:` : titleLabel);
    const variantIcons = {
        success: (0, jsx_runtime_1.jsx)(check_circle_icon_1.default, {}),
        danger: (0, jsx_runtime_1.jsx)(exclamation_circle_icon_1.default, {}),
        warning: (0, jsx_runtime_1.jsx)(exclamation_triangle_icon_1.default, {}),
        info: (0, jsx_runtime_1.jsx)(info_circle_icon_1.default, {}),
        custom: (0, jsx_runtime_1.jsx)(bell_icon_1.default, {})
    };
    const CustomIcon = !(0, exports.isVariantIcon)(titleIconVariant) && titleIconVariant;
    (0, helpers_2.useIsomorphicLayoutEffect)(() => {
        setHasTooltip(h1.current && h1.current.offsetWidth < h1.current.scrollWidth);
    }, []);
    const content = ((0, jsx_runtime_1.jsxs)("h1", Object.assign({ id: id, ref: h1, className: (0, react_styles_1.css)(modal_box_1.default.modalBoxTitle, titleIconVariant && modal_box_1.default.modifiers.icon, className) }, props, { children: [titleIconVariant && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(modal_box_1.default.modalBoxTitleIcon), children: (0, exports.isVariantIcon)(titleIconVariant) ? variantIcons[titleIconVariant] : (0, jsx_runtime_1.jsx)(CustomIcon, {}) })), label && (0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: label }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(modal_box_1.default.modalBoxTitleText), children: title })] })));
    return hasTooltip ? (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: title, children: content }) : content;
};
exports.ModalBoxTitle = ModalBoxTitle;
exports.ModalBoxTitle.displayName = 'ModalBoxTitle';
//# sourceMappingURL=ModalBoxTitle.js.map