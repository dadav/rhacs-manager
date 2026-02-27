import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/SimpleList/simple-list.mjs';
export const SimpleListGroup = (_a) => {
    var { children = null, className = '', title = '', titleClassName = '', id = '' } = _a, props = __rest(_a, ["children", "className", "title", "titleClassName", "id"]);
    return (_jsxs("section", Object.assign({ className: css(styles.simpleListSection) }, props, { children: [_jsx("h2", { id: id, className: css(styles.simpleListTitle, titleClassName), "aria-hidden": "true", children: title }), _jsx("ul", { className: css('pf-v6-c-simple-list__list', className), role: "list", "aria-labelledby": id, children: children })] })));
};
SimpleListGroup.displayName = 'SimpleListGroup';
//# sourceMappingURL=SimpleListGroup.js.map