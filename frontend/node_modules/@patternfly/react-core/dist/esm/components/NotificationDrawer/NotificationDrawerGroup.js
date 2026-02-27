import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer.mjs';
import maxLines from '@patternfly/react-tokens/dist/esm/c_notification_drawer__group_toggle_title_max_lines';
import { Badge } from '../Badge';
import { Tooltip } from '../Tooltip';
export const NotificationDrawerGroup = (_a) => {
    var { children, className = '', count, isExpanded, isRead = false, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onExpand = (event, expanded) => undefined, title, truncateTitle = 0, tooltipPosition, headingLevel: HeadingLevel = 'h1' } = _a, props = __rest(_a, ["children", "className", "count", "isExpanded", "isRead", "onExpand", "title", "truncateTitle", "tooltipPosition", "headingLevel"]);
    const titleRef = useRef(null);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    useEffect(() => {
        // Title will always truncate on overflow regardless of truncateTitle prop
        const showTooltip = titleRef.current && titleRef.current.offsetHeight < titleRef.current.scrollHeight;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
        if (!titleRef.current || !truncateTitle) {
            return;
        }
        titleRef.current.style.setProperty(maxLines.name, truncateTitle.toString());
    }, [titleRef, truncateTitle, isTooltipVisible]);
    const Title = (_jsx("div", Object.assign({}, (isTooltipVisible && { tabIndex: 0 }), { ref: titleRef, className: css(styles.notificationDrawerGroupToggleTitle), children: title })));
    return (_jsxs("section", Object.assign({}, props, { className: css(styles.notificationDrawerGroup, isExpanded && styles.modifiers.expanded, className), children: [_jsx(HeadingLevel, { children: _jsxs("button", { className: css(styles.notificationDrawerGroupToggle), "aria-expanded": isExpanded, onClick: (e) => onExpand(e, !isExpanded), onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onExpand(e, !isExpanded);
                        }
                    }, children: [isTooltipVisible ? (_jsx(Tooltip, { content: title, position: tooltipPosition, children: Title })) : (Title), _jsx("div", { className: css(styles.notificationDrawerGroupToggleCount), children: _jsx(Badge, { isRead: isRead, children: count }) }), _jsx("span", { className: styles.notificationDrawerGroupToggleIcon, children: _jsx(AngleRightIcon, {}) })] }) }), children] })));
};
NotificationDrawerGroup.displayName = 'NotificationDrawerGroup';
//# sourceMappingURL=NotificationDrawerGroup.js.map