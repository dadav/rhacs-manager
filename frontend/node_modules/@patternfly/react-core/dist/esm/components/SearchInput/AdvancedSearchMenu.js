import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button } from '../Button';
import { ActionGroup, Form, FormGroup } from '../Form';
import { TextInput } from '../TextInput';
import { GenerateId } from '../../helpers';
import { Panel, PanelMain, PanelMainBody } from '../Panel';
import { css } from '@patternfly/react-styles';
export const AdvancedSearchMenu = ({ className, parentRef, parentInputRef, value = '', attributes = [], formAdditionalItems, hasWordsAttrLabel = 'Has words', advancedSearchDelimiter, getAttrValueMap, onChange, onSearch, onClear, resetButtonLabel = 'Reset', submitSearchButtonLabel = 'Search', isSearchMenuOpen, onToggleAdvancedMenu }) => {
    const firstAttrRef = useRef(null);
    const [putFocusBackOnInput, setPutFocusBackOnInput] = useState(false);
    useEffect(() => {
        if (attributes.length > 0 && !advancedSearchDelimiter) {
            // eslint-disable-next-line no-console
            console.error('AdvancedSearchMenu: An advancedSearchDelimiter prop is required when advanced search attributes are provided using the attributes prop');
        }
    });
    useEffect(() => {
        if (isSearchMenuOpen && firstAttrRef && firstAttrRef.current) {
            firstAttrRef.current.focus();
            setPutFocusBackOnInput(true);
        }
        else if (!isSearchMenuOpen && putFocusBackOnInput && parentInputRef && parentInputRef.current) {
            parentInputRef.current.focus();
        }
    }, [isSearchMenuOpen]);
    useEffect(() => {
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
                formGroups.push(_jsx(FormGroup, { label: display, fieldId: `${queryAttr}_${index}`, children: _jsx(TextInput, { ref: firstAttrRef, type: "text", id: `${queryAttr}_${index}`, value: getValue(queryAttr), onChange: (evt, value) => handleValueChange(queryAttr, value, evt) }) }, `${attribute}_${index}`));
            }
            else {
                formGroups.push(_jsx(FormGroup, { label: display, fieldId: `${queryAttr}_${index}`, children: _jsx(TextInput, { type: "text", id: `${queryAttr}_${index}`, value: getValue(queryAttr), onChange: (evt, value) => handleValueChange(queryAttr, value, evt) }) }, `${attribute}_${index}`));
            }
        });
        formGroups.push(_jsx(GenerateId, { children: (randomId) => (_jsx(FormGroup, { label: hasWordsAttrLabel, fieldId: randomId, children: _jsx(TextInput, { type: "text", id: randomId, value: getValue('haswords'), onChange: (evt, value) => handleValueChange('haswords', value, evt) }) })) }, 'hasWords'));
        return formGroups;
    };
    return isSearchMenuOpen ? (_jsx(Panel, { variant: "raised", className: css(className), children: _jsx(PanelMain, { children: _jsx(PanelMainBody, { children: _jsxs(Form, { children: [buildFormGroups(), formAdditionalItems ? formAdditionalItems : null, _jsxs(ActionGroup, { children: [_jsx(Button, { variant: "primary", type: "submit", onClick: onSearchHandler, isDisabled: !value, children: submitSearchButtonLabel }), !!onClear && (_jsx(Button, { variant: "link", type: "reset", onClick: onClear, children: resetButtonLabel }))] })] }) }) }) })) : null;
};
AdvancedSearchMenu.displayName = 'SearchInput';
//# sourceMappingURL=AdvancedSearchMenu.js.map