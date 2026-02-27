"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToggleTemplate = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
/** Allows more customization of the pagination dropdown toggle. The following properties
 * should be passed into the pagination component's toggleTemplate property.
 */
const react_1 = require("react");
const ToggleTemplate = ({ firstIndex = 0, lastIndex = 0, itemCount = 0, itemsTitle = 'items', ofWord = 'of' }) => ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("b", { children: [firstIndex, " - ", lastIndex] }), ' ', ofWord, " ", (0, jsx_runtime_1.jsx)("b", { children: itemCount }), " ", itemsTitle] }));
exports.ToggleTemplate = ToggleTemplate;
exports.ToggleTemplate.displayName = 'ToggleTemplate';
//# sourceMappingURL=ToggleTemplate.js.map