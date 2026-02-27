import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/TreeView/tree-view.mjs';
import formStyles from '@patternfly/react-styles/css/components/FormControl/form-control.mjs';
import SearchIcon from '@patternfly/react-icons/dist/esm/icons/search-icon';
export const TreeViewSearch = (_a) => {
    var { className, onSearch, id, name, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["className", "onSearch", "id", "name", 'aria-label']);
    return (_jsx("div", { className: css(styles.treeViewSearch, className), children: _jsxs("div", { className: css(formStyles.formControl, formStyles.modifiers.icon), children: [_jsx("input", Object.assign({ onChange: onSearch, id: id, name: name, "aria-label": ariaLabel, type: "search" }, props)), _jsx("div", { className: css(formStyles.formControlUtilities), children: _jsx("div", { className: css(formStyles.formControlIcon), children: _jsx(SearchIcon, {}) }) })] }) }));
};
TreeViewSearch.displayName = 'TreeViewSearch';
//# sourceMappingURL=TreeViewSearch.js.map