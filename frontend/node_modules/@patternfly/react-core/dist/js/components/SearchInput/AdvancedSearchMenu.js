"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedSearchMenu = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("../Button");
const Form_1 = require("../Form");
const TextInput_1 = require("../TextInput");
const helpers_1 = require("../../helpers");
const Panel_1 = require("../Panel");
const react_styles_1 = require("@patternfly/react-styles");
const AdvancedSearchMenu = ({ className, parentRef, parentInputRef, value = '', attributes = [], formAdditionalItems, hasWordsAttrLabel = 'Has words', advancedSearchDelimiter, getAttrValueMap, onChange, onSearch, onClear, resetButtonLabel = 'Reset', submitSearchButtonLabel = 'Search', isSearchMenuOpen, onToggleAdvancedMenu }) => {
    const firstAttrRef = (0, react_1.useRef)(null);
    const [putFocusBackOnInput, setPutFocusBackOnInput] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (attributes.length > 0 && !advancedSearchDelimiter) {
            // eslint-disable-next-line no-console
            console.error('AdvancedSearchMenu: An advancedSearchDelimiter prop is required when advanced search attributes are provided using the attributes prop');
        }
    });
    (0, react_1.useEffect)(() => {
        if (isSearchMenuOpen && firstAttrRef && firstAttrRef.current) {
            firstAttrRef.current.focus();
            setPutFocusBackOnInput(true);
        }
        else if (!isSearchMenuOpen && putFocusBackOnInput && parentInputRef && parentInputRef.current) {
            parentInputRef.current.focus();
        }
    }, [isSearchMenuOpen]);
    (0, react_1.useEffect)(() => {
        const onDocClick = (event) => {
            const clickedWithinSearchInput = parentRef && parentRef.current.contains(event.target);
            if (isSearchMenuOpen && !clickedWithinSearchInput) {
                onToggleAdvancedMenu(event);
            }
        };
        const onEscPress = (event) => {
            if (event.key === 'Escape' && isSearchMenuOpen) {
                onToggleAdvancedMenu(event);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('touchstart', onDocClick);
        document.addEventListener('keydown', onEscPress);
        return function cleanup() {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('touchstart', onDocClick);
            document.removeEventListener('keydown', onEscPress);
        };
    }, [isSearchMenuOpen, parentRef, onToggleAdvancedMenu]);
    const onSearchHandler = (event) => {
        event.preventDefault();
        if (onSearch) {
            onSearch(event, value, getAttrValueMap());
        }
        if (isSearchMenuOpen) {
            onToggleAdvancedMenu(event);
        }
    };
    const handleValueChange = (attribute, newValue, event) => {
        const newMap = getAttrValueMap();
        newMap[attribute] = newValue;
        let updatedValue = '';
        Object.entries(newMap).forEach(([k, v]) => {
            if (v.trim() !== '') {
                /* Wrap the value in quotes if it contains spaces */
                const quoteWrappedValue = v.includes(' ') ? `'${v.replace(/(^'|'$)/g, '')}'` : v;
                if (k !== 'haswords') {
                    updatedValue = `${updatedValue} ${k}${advancedSearchDelimiter}${quoteWrappedValue}`;
                }
                else {
                    updatedValue = `${updatedValue} ${quoteWrappedValue}`;
                }
            }
        });
        if (onChange) {
            onChange(event, updatedValue.replace(/^\s+/g, ''));
        }
    };
    const getValue = (attribute) => {
        const map = getAttrValueMap();
        return map.hasOwnProperty(attribute) ? map[attribute] : '';
    };
    const buildFormGroups = () => {
        const formGroups = [];
        attributes.forEach((attribute, index) => {
            const display = typeof attribute === 'string' ? attribute : attribute.display;
            const queryAttr = typeof attribute === 'string' ? attribute : attribute.attr;
            if (index === 0) {
                formGroups.push((0, jsx_runtime_1.jsx)(Form_1.FormGroup, { label: display, fieldId: `${queryAttr}_${index}`, children: (0, jsx_runtime_1.jsx)(TextInput_1.TextInput, { ref: firstAttrRef, type: "text", id: `${queryAttr}_${index}`, value: getValue(queryAttr), onChange: (evt, value) => handleValueChange(queryAttr, value, evt) }) }, `${attribute}_${index}`));
            }
            else {
                formGroups.push((0, jsx_runtime_1.jsx)(Form_1.FormGroup, { label: display, fieldId: `${queryAttr}_${index}`, children: (0, jsx_runtime_1.jsx)(TextInput_1.TextInput, { type: "text", id: `${queryAttr}_${index}`, value: getValue(queryAttr), onChange: (evt, value) => handleValueChange(queryAttr, value, evt) }) }, `${attribute}_${index}`));
            }
        });
        formGroups.push((0, jsx_runtime_1.jsx)(helpers_1.GenerateId, { children: (randomId) => ((0, jsx_runtime_1.jsx)(Form_1.FormGroup, { label: hasWordsAttrLabel, fieldId: randomId, children: (0, jsx_runtime_1.jsx)(TextInput_1.TextInput, { type: "text", id: randomId, value: getValue('haswords'), onChange: (evt, value) => handleValueChange('haswords', value, evt) }) })) }, 'hasWords'));
        return formGroups;
    };
    return isSearchMenuOpen ? ((0, jsx_runtime_1.jsx)(Panel_1.Panel, { variant: "raised", className: (0, react_styles_1.css)(className), children: (0, jsx_runtime_1.jsx)(Panel_1.PanelMain, { children: (0, jsx_runtime_1.jsx)(Panel_1.PanelMainBody, { children: (0, jsx_runtime_1.jsxs)(Form_1.Form, { children: [buildFormGroups(), formAdditionalItems ? formAdditionalItems : null, (0, jsx_runtime_1.jsxs)(Form_1.ActionGroup, { children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "primary", type: "submit", onClick: onSearchHandler, isDisabled: !value, children: submitSearchButtonLabel }), !!onClear && ((0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "link", type: "reset", onClick: onClear, children: resetButtonLabel }))] })] }) }) }) })) : null;
};
exports.AdvancedSearchMenu = AdvancedSearchMenu;
exports.AdvancedSearchMenu.displayName = 'SearchInput';
//# sourceMappingURL=AdvancedSearchMenu.js.map