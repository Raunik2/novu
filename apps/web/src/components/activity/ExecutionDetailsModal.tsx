import { Grid, LoadingOverlay, Modal, useMantineTheme } from '@mantine/core';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

import { ExecutionDetailsSteps } from './ExecutionDetailsSteps';

import { getActivityForNotification } from '../../api/activity';
import { colors, shadows, Title, Text } from '../../design-system';
import { GotAQuestionButton } from '../utils/GotAQuestionButton';

const LinkText = styled(Text)`
  color: ${colors.B60};
  font-size: 14px;
`;

const LinkWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ActionsWrapper = styled(LinkWrapper)`
  margin: 0;
`;

const ExecutionDetailsFooter = ({ onClose, origin }) => {
  const linkText = ` Back to ${origin}`;

  return (
    <Grid justify="center">
      <Grid.Col span={2}>
        <LinkWrapper>
          <Link to={origin} onClick={onClose}>
            <LinkText>{linkText}</LinkText>
          </Link>
        </LinkWrapper>
      </Grid.Col>
      <Grid.Col span={2} offset={8}>
        <ActionsWrapper>
          {/* TODO: Button has a margin top that's not possible to overload */}
          <GotAQuestionButton mt={30} size="md" />
        </ActionsWrapper>
      </Grid.Col>
    </Grid>
  );
};

export function ExecutionDetailsModal({
  notificationId,
  modalVisibility,
  origin,
  onClose,
}: {
  notificationId: string;
  modalVisibility: boolean;
  onClose: () => void;
  origin: string;
}) {
  const theme = useMantineTheme();
  const { data, isLoading, isFetching } = useQuery(['activity', 'notificationId'], function () {
    if (notificationId) {
      return getActivityForNotification(notificationId);
    }
  });

  console.log('notificationId', notificationId, 'data', data);

  return (
    <Modal
      opened={modalVisibility}
      overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
      overlayOpacity={0.7}
      styles={{
        modal: {
          backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          width: '60%',
        },
        body: {
          paddingTop: '5px',
        },
        inner: {
          paddingTop: '180px',
        },
      }}
      title={<Title size={2}>Execution details</Title>}
      sx={{ backdropFilter: 'blur(10px)' }}
      shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
      radius="md"
      size="lg"
      onClose={onClose}
    >
      <LoadingOverlay
        visible={isLoading || isFetching}
        overlayColor={theme.colorScheme === 'dark' ? colors.B30 : colors.B98}
        loaderProps={{
          color: colors.error,
        }}
        data-test-id="execution-details-modal-loading-overlay"
      />
      <ExecutionDetailsSteps steps={[]} />
      <ExecutionDetailsFooter onClose={onClose} origin={origin} />
    </Modal>
  );
}
