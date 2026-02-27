import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/** Allows more customization of the pagination dropdown toggle. The following properties
 * should be passed into the pagination component's toggleTemplate property.
 */
import { Fragment } from 'react';
export const ToggleTemplate = ({ firstIndex = 0, lastIndex = 0, itemCount = 0, itemsTitle = 'items', ofWord = 'of' }) => (_jsxs(Fragment, { children: [_jsxs("b", { children: [firstIndex, " - ", lastIndex] }), ' ', ofWord, " ", _jsx("b", { children: itemCount }), " ", itemsTitle] }));
ToggleTemplate.displayName = 'ToggleTemplate';
//# sourceMappingURL=ToggleTemplate.js.map