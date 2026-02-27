"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardNavItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const exclamation_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/exclamation-circle-icon'));
const check_circle_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/check-circle-icon'));
const helpers_1 = require("../../helpers");
const types_1 = require("./types");
const WizardNavItem = (_a) => {
    var { children = null, content = '', isCurrent = false, isDisabled = false, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isVisited = false, stepIndex, onClick, component: NavItemComponent = 'button', href, isExpandable = false, id, status = 'default', target, ouiaId, ouiaSafe = true, className } = _a, props = tslib_1.__rest(_a, ["children", "content", "isCurrent", "isDisabled", "isVisited", "stepIndex", "onClick", "component", "href", "isExpandable", "id", "status", "target", "ouiaId", "ouiaSafe", "className"]);
    const [isExpanded, setIsExpanded] = (0, react_1.useState)(false);
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.WizardNavItem.displayName, ouiaId, ouiaSafe);
    (0, react_1.useEffect)(() => {
        setIsExpanded(isCurrent);
    }, [isCurrent]);
    if (NavItemComponent === 'a' && !href && process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('WizardNavItem: When using an anchor, please provide an href');
    }
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ className: (0, react_styles_1.css)(wizard_1.default.wizardNavItem, isExpandable && wizard_1.default.modifiers.expandable, isExpandable && isExpanded && wizard_1.default.modifiers.expanded, className) }, props, { children: [(0, jsx_runtime_1.jsxs)(NavItemComponent, Object.assign({}, (NavItemComponent === 'a'
                ? { tabIndex: isDisabled ? -1 : undefined, href, target }
                : { disabled: isDisabled }), (id && { id: id.toString() }), { onClick: (e) => {
                    e.stopPropagation();
                    isExpandable ? setIsExpanded(!isExpanded || isCurrent) : onClick === null || onClick === void 0 ? void 0 : onClick(e, stepIndex);
                }, className: (0, react_styles_1.css)(wizard_1.default.wizardNavLink, isCurrent && wizard_1.default.modifiers.current, isDisabled && wizard_1.default.modifiers.disabled, status === types_1.WizardNavItemStatus.Error && wizard_1.default.modifiers.danger, status === types_1.WizardNavItemStatus.Success && wizard_1.default.modifiers.success), "aria-disabled": isDisabled ? true : null, "aria-current": isCurrent && !children ? 'step' : false }, (isExpandable && { 'aria-expanded': isExpanded }), ouiaProps, { children: [status !== types_1.WizardNavItemStatus.Default && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("span", { className: "pf-v6-screen-reader", children: [", ", status] }), (0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkStatusIcon), children: [status === types_1.WizardNavItemStatus.Error && (0, jsx_runtime_1.jsx)(exclamation_circle_icon_1.default, {}), status === types_1.WizardNavItemStatus.Success && (0, jsx_runtime_1.jsx)(check_circle_icon_1.default, {})] })] })), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkMain), children: isExpandable ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { className: "pf-v6-c-wizard__nav-link-text", children: content }), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkToggle), children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavLinkToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, { "aria-label": `${isCurrent ? 'Collapse' : 'Expand'} step icon` }) }) })] })) : ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: content })) })] })), children] })));
};
exports.WizardNavItem = WizardNavItem;
exports.WizardNavItem.displayName = 'WizardNavItem';
//# sourceMappingURL=WizardNavItem.js.map