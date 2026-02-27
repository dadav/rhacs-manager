import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/List/list.mjs';
import { css } from '@patternfly/react-styles';
export const ListItem = (_a) => {
    var { className, children = null, icon = null } = _a, props = __rest(_a, ["className", "children", "icon"]);
    return (_jsxs("li", Object.assign({ className: css(icon && styles.listItem, className) }, props, { children: [icon && _jsx("span", { className: css(styles.listItemIcon), children: icon }), _jsx("span", { className: icon && css(`${styles.list}__item-text`), children: children })] })));
};
ListItem.displayName = 'ListItem';
//# sourceMappingURL=ListItem.js.map