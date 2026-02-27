import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useEffect, useRef, useState } from 'react';
import BellIcon from '@patternfly/react-icons/dist/esm/icons/bell-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer.mjs';
import maxLines from '@patternfly/react-tokens/dist/esm/c_notification_drawer__list_item_header_title_max_lines';
import { Tooltip } from '../Tooltip';
export const variantIcons = {
    success: CheckCircleIcon,
    danger: ExclamationCircleIcon,
    warning: ExclamationTriangleIcon,
    info: InfoCircleIcon,
    custom: BellIcon
};
export const NotificationDrawerListItemHeader = (_a) => {
    var { children, className = '', icon = null, srTitle, title, variant = 'custom', truncateTitle = 0, tooltipPosition, headingLevel: HeadingLevel = 'h2', actionHasNoOffset = false } = _a, props = __rest(_a, ["children", "className", "icon", "srTitle", "title", "variant", "truncateTitle", "tooltipPosition", "headingLevel", "actionHasNoOffset"]);
    const titleRef = useRef(null);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    useEffect(() => {
        if (!titleRef.current || !truncateTitle) {
            return;
        }
        titleRef.current.style.setProperty(maxLines.name, truncateTitle.toString());
        const showTooltip = titleRef.current && titleRef.current.offsetHeight < titleRef.current.scrollHeight;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
    }, [titleRef, truncateTitle, isTooltipVisible]);
    const Icon = variantIcons[variant];
    const Title = (_jsxs(HeadingLevel, Object.assign({}, (isTooltipVisible && { tabIndex: 0 }), { ref: titleRef, className: css(styles.notificationDrawerListItemHeaderTitle, truncateTitle && styles.modifiers.truncate), children: [srTitle && _jsx("span", { className: "pf-v6-screen-reader", children: srTitle }), title] })));
    return (_jsxs(Fragment, { children: [_jsxs("div", Object.assign({}, props, { className: css(styles.notificationDrawerListItemHeader, className), children: [_jsx("span", { className: css(styles.notificationDrawerListItemHeaderIcon), children: icon ? icon : _jsx(Icon, {}) }), isTooltipVisible ? (_jsx(Tooltip, { content: title, position: tooltipPosition, children: Title })) : (Title)] })), children && (_jsx("div", { className: css(styles.notificationDrawerListItemAction, actionHasNoOffset && styles.modifiers.noOffset), children: children }))] }));
};
NotificationDrawerListItemHeader.displayName = 'NotificationDrawerListItemHeader';
//# sourceMappingURL=NotificationDrawerListItemHeader.js.map