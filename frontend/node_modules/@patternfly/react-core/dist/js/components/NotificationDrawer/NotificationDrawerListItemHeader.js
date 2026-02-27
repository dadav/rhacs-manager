"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDrawerListItemHeader = exports.variantIcons = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const bell_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/bell-icon'));
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const exclamation_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-circle-icon'));
const exclamation_triangle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-triangle-icon'));
const info_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/info-circle-icon'));
const react_styles_1 = require("@patternfly/react-styles");
const notification_drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer"));
const c_notification_drawer__list_item_header_title_max_lines_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_notification_drawer__list_item_header_title_max_lines'));
const Tooltip_1 = require("../Tooltip");
exports.variantIcons = {
    success: check_circle_icon_1.default,
    danger: exclamation_circle_icon_1.default,
    warning: exclamation_triangle_icon_1.default,
    info: info_circle_icon_1.default,
    custom: bell_icon_1.default
};
const NotificationDrawerListItemHeader = (_a) => {
    var { children, className = '', icon = null, srTitle, title, variant = 'custom', truncateTitle = 0, tooltipPosition, headingLevel: HeadingLevel = 'h2', actionHasNoOffset = false } = _a, props = tslib_1.__rest(_a, ["children", "className", "icon", "srTitle", "title", "variant", "truncateTitle", "tooltipPosition", "headingLevel", "actionHasNoOffset"]);
    const titleRef = (0, react_1.useRef)(null);
    const [isTooltipVisible, setIsTooltipVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!titleRef.current || !truncateTitle) {
            return;
        }
        titleRef.current.style.setProperty(c_notification_drawer__list_item_header_title_max_lines_1.default.name, truncateTitle.toString());
        const showTooltip = titleRef.current && titleRef.current.offsetHeight < titleRef.current.scrollHeight;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
    }, [titleRef, truncateTitle, isTooltipVisible]);
    const Icon = exports.variantIcons[variant];
    const Title = ((0, jsx_runtime_1.jsxs)(HeadingLevel, Object.assign({}, (isTooltipVisible && { tabIndex: 0 }), { ref: titleRef, className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerListItemHeaderTitle, truncateTitle && notification_drawer_1.default.modifiers.truncate), children: [srTitle && (0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: srTitle }), title] })));
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerListItemHeader, className), children: [(0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerListItemHeaderIcon), children: icon ? icon : (0, jsx_runtime_1.jsx)(Icon, {}) }), isTooltipVisible ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: title, position: tooltipPosition, children: Title })) : (Title)] })), children && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerListItemAction, actionHasNoOffset && notification_drawer_1.default.modifiers.noOffset), children: children }))] }));
};
exports.NotificationDrawerListItemHeader = NotificationDrawerListItemHeader;
exports.NotificationDrawerListItemHeader.displayName = 'NotificationDrawerListItemHeader';
//# sourceMappingURL=NotificationDrawerListItemHeader.js.map