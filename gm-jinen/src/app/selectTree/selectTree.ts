import { Component, input, signal, model, computed, effect, untracked } from '@angular/core';

export type SelectNode = {
  name: string;
  checked?: boolean; // undefinedの場合は、falseとみなす
  indeterminate?: boolean; // 子ノードにチェックがある場合にtrue
  children?: SelectNode[];
}

@Component({
  selector: 'app-select-tree',
  imports: [],
  templateUrl: './selectTree.html',
  styleUrl: './selectTree.scss'
})
export class SelectTree {
  readonly isRoot = input<boolean>(true);
  readonly modelNodes = model<SelectNode[]>([], {alias: 'nodes'});
  readonly nodes = signal<SelectNode[]>(this.modelNodes());

  // childrenがすべてtrueの時、親もtrueするためのロジック
  readonly updateParentNode = (node: SelectNode): SelectNode => {
    if (!node.children || node.children.length === 0) {
      const checked = node.checked ?? false;
      const indeterminate = node.indeterminate ?? false;
      return {...node, checked: checked, indeterminate: indeterminate};
    }

    const children = node.children.map(child => this.updateParentNode(child));
    const allChildrenChecked = children.every(child => child.checked);
    const someChildrenChecked = children.some(child => (child.checked ?? false) || (child.indeterminate ?? false));

    return {...node, 
      children: children, 
      checked: allChildrenChecked, 
      indeterminate: !allChildrenChecked && someChildrenChecked
    };
  };

  constructor() {
    effect(() => {
      const modelNodes = this.modelNodes();
      untracked(() => {
        this.nodes.set(modelNodes.map(node => {
          return this.updateParentNode(node);
        }));
      });
    });
  }

  // 葉ノードのチェック状態を変更するためのメソッド
  readonly setNodeChecked = (node: SelectNode, checked: boolean): SelectNode => {
    if (!node.children || node.children.length === 0) {
      return {...node, checked: checked};
    }
    const children = node.children.map(child => this.setNodeChecked(child, checked));
    return {...node, children: children};
  };

  readonly allChecked = computed(() => {
    return this.nodes().every(node => node.checked);
  });

  readonly someChecked = computed(() => {
    return this.nodes().some(node => node.checked || node.indeterminate);
  });

  readonly toggleAll = () => {
    this.modelNodes.set(this.nodes().map(node => {
      return this.setNodeChecked(node, !this.allChecked());
    }));
  };

  readonly onCheck = (node: SelectNode) => {
    const updateNodeAndParents = (nodes: SelectNode[]): SelectNode[] => {
      return nodes.map(n => {
        if (n.name === node.name) {
          const updated = this.setNodeChecked(n, !(node.checked ?? false));
          return this.updateParentNode(updated);
        }
        if (n.children?.length) {
          const children = updateNodeAndParents(n.children);
          return this.updateParentNode({ ...n, children });
        }
        return n;
      });
    };

    this.modelNodes.set(updateNodeAndParents(this.nodes()));
  };

  readonly openedParentNode = signal<string | null>(null);
  readonly toggleChildren = (node: SelectNode) => {
    if (this.openedParentNode() === node.name) {
      this.openedParentNode.set(null);
    } else {
      this.openedParentNode.set(node.name);
    }
  };
}
