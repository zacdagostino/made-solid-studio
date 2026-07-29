import type { Meta, StoryObj } from '@storybook/react-vite';
import { Wrench, X } from 'lucide-react';
import { Button, ButtonGroup, ButtonLink, Card, Eyebrow, IconButton, StatusBadge } from './ui';

const meta = {
  title: 'Made Solid Studio/Foundation',
  component: Button,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Run audit',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Review record',
    variant: 'secondary',
  },
};

export const SmallTextAction: Story = {
  args: {
    children: (
      <>
        <Wrench aria-hidden="true" size={15} />
        Workshop behaviour
      </>
    ),
    size: 'small',
    variant: 'secondary',
  },
};

export const IconOnly: Story = {
  render: () => (
    <IconButton label="Close dialog" variant="quiet">
      <X aria-hidden="true" size={18} />
    </IconButton>
  ),
};

export const ActionGroup: Story = {
  render: () => (
    <ButtonGroup>
      <Button variant="secondary">Cancel</Button>
      <Button>Save changes</Button>
    </ButtonGroup>
  ),
};

export const NavigationLink: Story = {
  render: () => (
    <ButtonLink href="#button-link-example" variant="secondary">
      Open record
    </ButtonLink>
  ),
};

export const Disabled: Story = {
  args: {
    children: 'Awaiting URL',
    disabled: true,
  },
};

export const Statuses: Story = {
  render: () => (
    <Card className="storybook-stack">
      <Eyebrow>Review state</Eyebrow>
      <div className="storybook-row">
        <StatusBadge tone="success">Verified</StatusBadge>
        <StatusBadge tone="warning">Needs review</StatusBadge>
        <StatusBadge tone="danger">Blocked</StatusBadge>
      </div>
    </Card>
  ),
};
