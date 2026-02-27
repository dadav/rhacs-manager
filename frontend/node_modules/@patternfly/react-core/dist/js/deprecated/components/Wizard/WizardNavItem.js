"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardNavItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const helpers_1 = require("../../../helpers");
const WizardNavItem = (_a) => {
    var { children = null, content = '', isCurrent = false, isDisabled = false, step, onNavItemClick = () => undefined, navItemComponent = 'button', href = null, isExpandable = false, id, ouiaId, ouiaSafe = true } = _a, rest = tslib_1.__rest(_a, ["children", "content", "isCurrent", "isDisabled", "step", "onNavItemClick", "navItemComponent", "href", "isExpandable", "id", "ouiaId", "ouiaSafe"]);
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.WizardNavItem.displayName, ouiaId, ouiaSafe);
    const NavItemComponent = navItemComponent;
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
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
    return ((0, jsx_runtime_1.jsxs)("li", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavItem, isExpandable && wizard_1.default.modifiers.expandable, isExpandable && isExpanded && wizard_1.default.modifiers.expanded), children: [(0, jsx_runtime_1.jsx)(NavItemComponent, Object.assign({}, rest, (navItemComponent === 'a' ? Object.assign({}, linkProps) : Object.assign({}, btnProps)), (id && { id: id.toString() }), { onClick: () => (isExpandable ? setIsExpanded(!isExpanded || isCurrent) : onNavItemClick(step)), className: (0, react_styles_1.css)(wizard_1.default.wizardNavLink, isCurrent && wizard_1.default.modifiers.current, isDisabled && wizard_1.default.modifiers.disabled), "aria-disabled": isDisabled ? true : null, "aria-current": isCurrent && !children ? 'step' : false }, (isExpandable && { 'aria-expanded': isExpanded }), ouiaProps, { children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkMain), children: isExpandable ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "pf-v6-c-wizard__nav-link-text", children: content }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkToggle), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })] })) : (content) }) })), children] }));
};
exports.WizardNavItem = WizardNavItem;
exports.WizardNavItem.displayName = 'WizardNavItem';
//# sourceMappingURL=WizardNavItem.js.map