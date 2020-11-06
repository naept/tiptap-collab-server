import { Schema } from 'prosemirror-model';

const schema = {
  nodes: {
    blockquote: {
      content: 'block+',
      group: 'block',
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: 'blockquote',
        },
      ],
    },
    bullet_list: {
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        {
          tag: 'ul',
        },
      ],
    },
    code_block: {
      code: 'true',
      content: 'text*',
      defining: true,
      draggable: false,
      group: 'block',
      marks: '',
      parseDOM: [
        {
          preserveWhitespace: 'full',
          tag: 'pre',
        },
      ],
    },
    doc: {
      content: 'block+',
    },
    hard_break: {
      group: 'inline',
      inline: true,
      parseDOM: [
        {
          tag: 'br',
        },
      ],
      selectable: false,
    },
    heading: {
      attrs: {
        level: {
          default: 1,
        },
      },
      content: 'inline*',
      defining: true,
      draggable: false,
      group: 'block',
      parseDOM: [
        {
          tag: 'h1',
          attrs: {
            level: 1,
          },
        },
        {
          tag: 'h2',
          attrs: {
            level: 2,
          },
        },
        {
          tag: 'h3',
          attrs: {
            level: 3,
          },
        },
      ],
    },
    image: {
      attrs: {
        alt: {
          default: null,
        },
        src: {},
        title: {
          default: null,
        },
      },
      draggable: true,
      group: 'inline',
      inline: true,
      parseDOM: [
        {
          tag: 'img[src]',
        },
      ],
    },
    list_item: {
      content: 'paragraph block*',
      defining: true,
      draggable: false,
      parseDOM: [
        {
          tag: 'li',
        },
      ],
    },
    ordered_list: {
      attrs: {
        order: {
          default: 1,
        },
      },
      content: 'list_item+',
      group: 'block',
      parseDOM: [
        {
          tag: 'ol',
        },
      ],
    },
    paragraph: {
      content: 'inline*',
      draggable: false,
      group: 'block',
      parseDOM: [
        {
          tag: 'p',
        },
      ],
    },
    table: {
      content: 'table_row+',
      group: 'block',
      isolating: true,
      parseDOM: [
        {
          tag: 'table',
        },
      ],
      tableRole: 'table',
    },
    table_cell: {
      attrs: {
        background: {
          default: null,
        },
        colspan: {
          default: null,
        },
        colwidth: {
          default: null,
        },
        rowspan: {
          default: 1,
        },
      },
      content: 'block+',
      isolating: true,
      parseDOM: [
        {
          tag: 'td',
        },
      ],
      tableRole: 'cell',
    },
    table_header: {
      attrs: {
        background: {
          default: null,
        },
        colspan: {
          default: 1,
        },
        colwidth: {
          default: null,
        },
        rowspan: {
          default: 1,
        },
      },
      content: 'block+',
      isolating: true,
      parseDOM: [
        {
          tag: 'th',
        },
      ],
      tableRole: 'header_cell',
    },
    table_row: {
      content: '(table_cell | table_header)*',
      parseDOM: [
        {
          tag: 'tr',
        },
      ],
      tableRole: 'row',
    },
    text: {
      group: 'inline',
    },
  },
  marks: {
    bold: {
      parseDOM: [
        {
          tag: 'strong',
        },
        {
          tag: 'b',
        },
        {
          style: 'font-weight',
        },
      ],
    },
    code: {
      parseDOM: [
        {
          tag: 'code',
        },
      ],
    },
    italic: {
      parseDOM: [
        {
          tag: 'i',
        },
        {
          tag: 'em',
        },
        {
          style: 'font-style=italic',
        },
      ],
    },
    link: {
      attrs: {
        href: {},
      },
      draggable: true,
      group: 'inline',
      inline: true,
      parseDOM: [
        {
          tag: 'a[href]',
        },
      ],
    },
    strike: {
      parseDOM: [
        {
          tag: 's',
        },
        {
          tag: 'del',
        },
        {
          tag: 'strike',
        },
        {
          style: 'text-decoration',
        },
      ],
    },
    underline: {
      parseDOM: [
        {
          tag: 'u',
        },
        {
          style: 'text-decoration',
        },
      ],
    },
  },
};

export default new Schema(schema);
