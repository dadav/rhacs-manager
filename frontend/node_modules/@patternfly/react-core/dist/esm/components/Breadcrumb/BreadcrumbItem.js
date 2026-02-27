import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import styles from '@patternfly/react-styles/css/components/Breadcrumb/breadcrumb.mjs';
import { css } from '@patternfly/react-styles';
export const BreadcrumbItem = (_a) => {
    var { children = null, className: classNameProp = '', to = undefined, isActive = false, isDropdown = false, showDivider, target = undefined, component = 'a', render = undefined } = _a, props = __rest(_a, ["children", "className", "to", "isActive", "isDropdown", "showDivider", "target", "component", "render"]);
    const Component = component;
    const ariaCurrent = isActive ? 'page' : undefined;
    const className = css(styles.breadcrumbLink, isActive && styles.modifiers.current);
    return (_jsxs("li", Object.assign({}, props, { className: css(styles.breadcrumbItem, classNameProp), children: [showDivider && (_jsx("span", { className: styles.breadcrumbItemDivider, children: _jsx(AngleRightIcon, {}) })), component === 'button' && (_jsx("button", { className: className, "aria-current": ariaCurrent, type: "button", children: children })), isDropdown && _jsx("span", { className: css(styles.breadcrumbDropdown), children: children }), render && render({ className, ariaCurrent }), to && !render && (_jsx(Component, { href: to, target: target, className: className, "aria-current": ariaCurrent, children: children })), !to && component !== 'button' && !isDropdown && children] })));
};
BreadcrumbItem.displayName = 'BreadcrumbItem';
//# sourceMappingURL=BreadcrumbItem.js.map