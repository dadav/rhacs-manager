"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDrawerGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const react_styles_1 = require("@patternfly/react-styles");
const notification_drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer"));
const c_notification_drawer__group_toggle_title_max_lines_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_notification_drawer__group_toggle_title_max_lines'));
const Badge_1 = require("../Badge");
const Tooltip_1 = require("../Tooltip");
const NotificationDrawerGroup = (_a) => {
    var { children, className = '', count, isExpanded, isRead = false, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onExpand = (event, expanded) => undefined, title, truncateTitle = 0, tooltipPosition, headingLevel: HeadingLevel = 'h1' } = _a, props = tslib_1.__rest(_a, ["children", "className", "count", "isExpanded", "isRead", "onExpand", "title", "truncateTitle", "tooltipPosition", "headingLevel"]);
    const titleRef = (0, react_1.useRef)(null);
    const [isTooltipVisible, setIsTooltipVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Title will always truncate on overflow regardless of truncateTitle prop
        const showTooltip = titleRef.current && titleRef.current.offsetHeight < titleRef.current.scrollHeight;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
        if (!titleRef.current || !truncateTitle) {
            return;
        }
        titleRef.current.style.setProperty(c_notification_drawer__group_toggle_title_max_lines_1.default.name, truncateTitle.toString());
    }, [titleRef, truncateTitle, isTooltipVisible]);
    const Title = ((0, jsx_runtime_1.jsx)("div", Object.assign({}, (isTooltipVisible && { tabIndex: 0 }), { ref: titleRef, className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerGroupToggleTitle), children: title })));
    return ((0, jsx_runtime_1.jsxs)("section", Object.assign({}, props, { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerGroup, isExpanded && notification_drawer_1.default.modifiers.expanded, className), children: [(0, jsx_runtime_1.jsx)(HeadingLevel, { children: (0, jsx_runtime_1.jsxs)("button", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerGroupToggle), "aria-expanded": isExpanded, onClick: (e) => onExpand(e, !isExpanded), onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onExpand(e, !isExpanded);
                        }
                    }, children: [isTooltipVisible ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: title, position: tooltipPosition, children: Title })) : (Title), (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerGroupToggleCount), children: (0, jsx_runtime_1.jsx)(Badge_1.Badge, { isRead: isRead, children: count }) }), (0, jsx_runtime_1.jsx)("span", { className: notification_drawer_1.default.notificationDrawerGroupToggleIcon, children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) })] }) }), children] })));
};
exports.NotificationDrawerGroup = NotificationDrawerGroup;
exports.NotificationDrawerGroup.displayName = 'NotificationDrawerGroup';
//# sourceMappingURL=NotificationDrawerGroup.js.map