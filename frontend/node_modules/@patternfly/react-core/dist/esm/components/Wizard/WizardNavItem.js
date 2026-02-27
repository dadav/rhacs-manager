import { __rest } from "tslib";
import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import { useOUIAProps } from '../../helpers';
import { WizardNavItemStatus } from './types';
export const WizardNavItem = (_a) => {
    var { children = null, content = '', isCurrent = false, isDisabled = false, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isVisited = false, stepIndex, onClick, component: NavItemComponent = 'button', href, isExpandable = false, id, status = 'default', target, ouiaId, ouiaSafe = true, className } = _a, props = __rest(_a, ["children", "content", "isCurrent", "isDisabled", "isVisited", "stepIndex", "onClick", "component", "href", "isExpandable", "id", "status", "target", "ouiaId", "ouiaSafe", "className"]);
    const [isExpanded, setIsExpanded] = useState(false);
    const ouiaProps = useOUIAProps(WizardNavItem.displayName, ouiaId, ouiaSafe);
    useEffect(() => {
        setIsExpanded(isCurrent);
    }, [isCurrent]);
    if (NavItemComponent === 'a' && !href && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('WizardNavItem: When using an anchor, please provide an href');
    }
    return (_jsxs("li", Object.assign({ className: css(styles.wizardNavItem, isExpandable && styles.modifiers.expandable, isExpandable && isExpanded && styles.modifiers.expanded, className) }, props, { children: [_jsxs(NavItemComponent, Object.assign({}, (NavItemComponent === 'a'
                ? { tabIndex: isDisabled ? -1 : undefined, href, target }
                : { disabled: isDisabled }), (id && { id: id.toString() }), { onClick: (e) => {
                    e.stopPropagation();
                    isExpandable ? setIsExpanded(!isExpanded || isCurrent) : onClick === null || onClick === void 0 ? void 0 : onClick(e, stepIndex);
                }, className: css(styles.wizardNavLink, isCurrent && styles.modifiers.current, isDisabled && styles.modifiers.disabled, status === WizardNavItemStatus.Error && styles.modifiers.danger, status === WizardNavItemStatus.Success && styles.modifiers.success), "aria-disabled": isDisabled ? true : null, "aria-current": isCurrent && !children ? 'step' : false }, (isExpandable && { 'aria-expanded': isExpanded }), ouiaProps, { children: [status !== WizardNavItemStatus.Default && (_jsxs(_Fragment, { children: [_jsxs("span", { className: "pf-v6-screen-reader", children: [", ", status] }), _jsxs("span", { className: css(styles.wizardNavLinkStatusIcon), children: [status === WizardNavItemStatus.Error && _jsx(ExclamationCircleIcon, {}), status === WizardNavItemStatus.Success && _jsx(CheckCircleIcon, {})] })] })), _jsx("span", { className: css(styles.wizardNavLinkMain), children: isExpandable ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "pf-v6-c-wizard__nav-link-text", children: content }), _jsx("span", { className: css(styles.wizardNavLinkToggle), children: _jsx("span", { className: css(styles.wizardNavLinkToggleIcon), children: _jsx(AngleRightIcon, { "aria-label": `${isCurrent ? 'Collapse' : 'Expand'} step icon` }) }) })] })) : (_jsx(_Fragment, { children: content })) })] })), children] })));
};
WizardNavItem.displayName = 'WizardNavItem';
//# sourceMappingURL=WizardNavItem.js.map