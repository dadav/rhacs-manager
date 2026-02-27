import { __rest } from "tslib";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Wizard/wizard.mjs';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import { useOUIAProps } from '../../../helpers';
export const WizardNavItem = (_a) => {
    var { children = null, content = '', isCurrent = false, isDisabled = false, step, onNavItemClick = () => undefined, navItemComponent = 'button', href = null, isExpandable = false, id, ouiaId, ouiaSafe = true } = _a, rest = __rest(_a, ["children", "content", "isCurrent", "isDisabled", "step", "onNavItemClick", "navItemComponent", "href", "isExpandable", "id", "ouiaId", "ouiaSafe"]);
    const ouiaProps = useOUIAProps(WizardNavItem.displayName, ouiaId, ouiaSafe);
    const NavItemComponent = navItemComponent;
    const [isExpanded, setIsExpanded] = useState(false);
    useEffect(() => {
        setIsExpanded(isCurrent);
    }, [isCurrent]);
    if (navItemComponent === 'a' && !href && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('WizardNavItem: When using an anchor, please provide an href');
    }
    const btnProps = {
        disabled: isDisabled,
        type: 'button'
    };
    const linkProps = {
        tabIndex: isDisabled ? -1 : undefined,
        href
    };
    return (_jsxs("li", { className: css(styles.wizardNavItem, isExpandable && styles.modifiers.expandable, isExpandable && isExpanded && styles.modifiers.expanded), children: [_jsx(NavItemComponent, Object.assign({}, rest, (navItemComponent === 'a' ? Object.assign({}, linkProps) : Object.assign({}, btnProps)), (id && { id: id.toString() }), { onClick: () => (isExpandable ? setIsExpanded(!isExpanded || isCurrent) : onNavItemClick(step)), className: css(styles.wizardNavLink, isCurrent && styles.modifiers.current, isDisabled && styles.modifiers.disabled), "aria-disabled": isDisabled ? true : null, "aria-current": isCurrent && !children ? 'step' : false }, (isExpandable && { 'aria-expanded': isExpanded }), ouiaProps, { children: _jsx("span", { className: css(styles.wizardNavLinkMain), children: isExpandable ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "pf-v6-c-wizard__nav-link-text", children: content }), _jsx("span", { className: css(styles.wizardNavLinkToggle), children: _jsx("span", { className: css(styles.wizardNavLinkToggleIcon), children: _jsx(AngleRightIcon, {}) }) })] })) : (content) }) })), children] }));
};
WizardNavItem.displayName = 'WizardNavItem';
//# sourceMappingURL=WizardNavItem.js.map