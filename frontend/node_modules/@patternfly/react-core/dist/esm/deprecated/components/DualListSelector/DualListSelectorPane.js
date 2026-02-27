import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { css } from '@patternfly/react-styles';
import { DualListSelectorTree } from './DualListSelectorTree';
import { getUniqueId } from '../../../helpers';
import { DualListSelectorListWrapper } from './DualListSelectorListWrapper';
import { DualListSelectorContext, DualListSelectorPaneContext } from './DualListSelectorContext';
import { DualListSelectorList } from './DualListSelectorList';
import { SearchInput } from '../../../components/SearchInput';
import cssMenuMinHeight from '@patternfly/react-tokens/dist/esm/c_dual_list_selector__menu_MinHeight';
export const DualListSelectorPane = (_a) => {
    var { isChosen = false, className = '', status = '', actions, searchInput, children, onOptionSelect, onOptionCheck, title = '', options = [], selectedOptions = [], isSearchable = false, searchInputAriaLabel = '', onFilterUpdate, onSearchInputChanged, onSearchInputClear, filterOption, id = getUniqueId('dual-list-selector-pane'), isDisabled = false, listMinHeight } = _a, props = __rest(_a, ["isChosen", "className", "status", "actions", "searchInput", "children", "onOptionSelect", "onOptionCheck", "title", "options", "selectedOptions", "isSearchable", "searchInputAriaLabel", "onFilterUpdate", "onSearchInputChanged", "onSearchInputClear", "filterOption", "id", "isDisabled", "listMinHeight"]);
    const [input, setInput] = useState('');
    const { isTree } = useContext(DualListSelectorContext);
    // only called when search input is dynamically built
    const onChange = (e, newValue) => {
        let filtered;
        if (isTree) {
            filtered = options
                .map((opt) => Object.assign({}, opt))
                .filter((item) => filterInput(item, newValue));
        }
        else {
            filtered = options.filter((option) => {
                if (displayOption(option)) {
                    return option;
                }
            });
        }
        onFilterUpdate(filtered, isChosen ? 'chosen' : 'available', newValue === '');
        if (onSearchInputChanged) {
            onSearchInputChanged(e, newValue);
        }
        setInput(newValue);
    };
    // only called when options are passed via options prop and isTree === true
    const filterInput = (item, input) => {
        if (filterOption) {
            return filterOption(item, input);
        }
        else {
            if (item.text.toLowerCase().includes(input.toLowerCase()) || input === '') {
                return true;
            }
        }
        if (item.children) {
            return ((item.children = item.children
                .map((opt) => Object.assign({}, opt))
                .filter((child) => filterInput(child, input))).length > 0);
        }
    };
    // only called when options are passed via options prop and isTree === false
    const displayOption = (option) => {
        if (filterOption) {
            return filterOption(option, input);
        }
        else {
            return option.toString().toLowerCase().includes(input.toLowerCase());
        }
    };
    return (_jsxs("div", Object.assign({ className: css(styles.dualListSelectorPane, isChosen ? styles.modifiers.chosen : 'pf-m-available', className) }, props, { children: [title && (_jsx("div", { className: css(styles.dualListSelectorHeader), children: _jsx("div", { className: `${styles.dualListSelector}__title`, children: _jsx("div", { className: css(styles.dualListSelectorTitleText), children: title }) }) })), (actions || searchInput || isSearchable) && (_jsxs("div", { className: css(styles.dualListSelectorTools), children: [(isSearchable || searchInput) && (_jsx("div", { className: css(styles.dualListSelectorToolsFilter), children: searchInput ? (searchInput) : (_jsx(SearchInput, { onChange: isDisabled ? undefined : onChange, onClear: onSearchInputClear
                                ? onSearchInputClear
                                : (e) => onChange(e, ''), isDisabled: isDisabled, "aria-label": searchInputAriaLabel })) })), actions && _jsx("div", { className: css(styles.dualListSelectorToolsActions), children: actions })] })), status && (_jsx("div", { className: css(styles.dualListSelectorStatus), children: _jsx("div", { className: css(styles.dualListSelectorStatusText), id: `${id}-status`, children: status }) })), _jsxs(DualListSelectorPaneContext.Provider, { value: { isChosen }, children: [!isTree && (_jsx(DualListSelectorListWrapper, Object.assign({ "aria-labelledby": `${id}-status`, options: options, selectedOptions: selectedOptions, onOptionSelect: (e, index, id) => onOptionSelect(e, index, isChosen, id), displayOption: displayOption, id: `${id}-list`, isDisabled: isDisabled }, (listMinHeight && {
                        style: { [cssMenuMinHeight.name]: listMinHeight }
                    }), { children: children }))), isTree && (_jsx(DualListSelectorListWrapper, Object.assign({ "aria-labelledby": `${id}-status`, id: `${id}-list` }, (listMinHeight && {
                        style: { [cssMenuMinHeight.name]: listMinHeight }
                    }), { children: options.length > 0 ? (_jsx(DualListSelectorList, { children: _jsx(DualListSelectorTree, { data: isSearchable
                                    ? options
                                        .map((opt) => Object.assign({}, opt))
                                        .filter((item) => filterInput(item, input))
                                    : options, onOptionCheck: onOptionCheck, id: `${id}-tree`, isDisabled: isDisabled }) })) : (children) })))] })] })));
};
DualListSelectorPane.displayName = 'DualListSelectorPane';
//# sourceMappingURL=DualListSelectorPane.js.map