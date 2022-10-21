import { Injectable } from '@nestjs/common';
import { MessageRepository, JobRepository, JobStatusEnum } from '@novu/dal';
import { CreateLog } from '../../../../logs/usecases/create-log/create-log.usecase';
import { SendMessageCommand } from '../send-message.command';
import { SendMessageType } from '../send-message-type.usecase';
import { StepTypeEnum, DigestTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { GetDigestEventsRegular } from './get-digest-events-regular.usecase';
import { GetDigestEventsBackoff } from './get-digest-events-backoff.usecase';
import { CreateExecutionDetails } from '../../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { CreateExecutionDetailsCommand } from '../../../../execution-details/usecases/create-execution-details/create-execution-details.command';

@Injectable()
export class Digest extends SendMessageType {
  constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected jobRepository: JobRepository,
    private getDigestEventsRegular: GetDigestEventsRegular,
    private getDigestEventsBackoff: GetDigestEventsBackoff
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  public async execute(command: SendMessageCommand) {
    const events = await this.getEvents(command);
    const nextJobs = await this.getJobsToUpdate(command);

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: 'Steps to get digest events found ' + nextJobs.length,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(nextJobs),
      })
    );

    await this.jobRepository.update(
      {
        _id: {
          $in: nextJobs.map((job) => job._id),
        },
      },
      {
        $set: {
          digest: {
            events,
          },
        },
      }
    );
  }

  private async getEvents(command: SendMessageCommand) {
    const currentJob = await this.jobRepository.findOne({
      _id: command.jobId,
    });

    if (currentJob.digest.type === DigestTypeEnum.BACKOFF) {
      return this.getDigestEventsBackoff.execute(command);
    }

    return this.getDigestEventsRegular.execute(command);
  }

  private async getJobsToUpdate(command: SendMessageCommand) {
    const nextJobs = await this.jobRepository.find({
      transactionId: command.transactionId,
      _id: {
        $ne: command.jobId,
      },
    });

    return nextJobs.filter((job) => {
      if (job.type === StepTypeEnum.IN_APP && job.status === JobStatusEnum.COMPLETED) {
        return true;
      }

      return job.status !== JobStatusEnum.COMPLETED && job.status !== JobStatusEnum.FAILED;
    });
  }
}
