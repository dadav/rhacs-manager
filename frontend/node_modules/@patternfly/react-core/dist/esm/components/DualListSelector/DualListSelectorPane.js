import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { css } from '@patternfly/react-styles';
import { getUniqueId } from '../../helpers';
import { DualListSelectorListWrapper } from './DualListSelectorListWrapper';
import { DualListSelectorPaneContext } from './DualListSelectorContext';
import { SearchInput } from '../SearchInput';
import cssMenuMinHeight from '@patternfly/react-tokens/dist/esm/c_dual_list_selector__menu_MinHeight';
export const DualListSelectorPane = (_a) => {
    var { isChosen = false, className = '', status = '', actions, searchInput, children, title = '', id = getUniqueId('dual-list-selector-pane'), isDisabled = false, listMinHeight } = _a, props = __rest(_a, ["isChosen", "className", "status", "actions", "searchInput", "children", "title", "id", "isDisabled", "listMinHeight"]);
    return (_jsxs("div", Object.assign({ className: css(styles.dualListSelectorPane, isChosen ? styles.modifiers.chosen : 'pf-m-available', className) }, props, { children: [title && (_jsx("div", { className: css(styles.dualListSelectorHeader), children: _jsx("div", { className: `${styles.dualListSelector}__title`, children: _jsx("div", { className: css(styles.dualListSelectorTitleText), children: title }) }) })), (actions || searchInput) && (_jsxs("div", { className: css(styles.dualListSelectorTools), children: [searchInput && (_jsx("div", { className: css(styles.dualListSelectorToolsFilter), children: searchInput ? searchInput : _jsx(SearchInput, { isDisabled: isDisabled }) })), actions && _jsx("div", { className: css(styles.dualListSelectorToolsActions), children: actions })] })), status && (_jsx("div", { className: css(styles.dualListSelectorStatus), children: _jsx("div", { className: css(styles.dualListSelectorStatusText), id: `${id}-status`, children: status }) })), _jsx(DualListSelectorPaneContext.Provider, { value: { isChosen }, children: _jsx(DualListSelectorListWrapper, Object.assign({ "aria-labelledby": `${id}-status`, id: `${id}-list` }, (listMinHeight && {
                    style: { [cssMenuMinHeight.name]: listMinHeight }
                }), { children: children })) })] })));
};
DualListSelectorPane.displayName = 'DualListSelectorPane';
//# sourceMappingURL=DualListSelectorPane.js.map