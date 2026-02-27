import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Fragment } from 'react';
import { css } from '@patternfly/react-styles';
import { Divider } from '../Divider';
import styles from '@patternfly/react-styles/css/components/TreeView/tree-view.mjs';
export const TreeViewList = (_a) => {
    var { isNested = false, isMultiSelectable = false, toolbar, children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby } = _a, props = __rest(_a, ["isNested", "isMultiSelectable", "toolbar", "children", 'aria-label', 'aria-labelledby']);
    return (_jsxs(_Fragment, { children: [toolbar && (_jsxs(Fragment, { children: [toolbar, _jsx(Divider, {})] })), _jsx("ul", Object.assign({ className: css(`${styles.treeView}__list`), role: isNested ? 'group' : 'tree', "aria-multiselectable": isNested ? undefined : isMultiSelectable, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby }, props, { children: children }))] }));
};
TreeViewList.displayName = 'TreeViewList';
//# sourceMappingURL=TreeViewList.js.map