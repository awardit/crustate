
## When enqueuing messages

1. Emit event that we are about to enqueue the message, along with its source
2. Add the message to the inbox of the target

## When Processing messages

1. Traverse the state-tree to its first leaf node
2. If the inbox is not empty, then

   1. Pop the oldest message from the inbox
   2. Emit event that we are about to process it?
   3. If it matches any subscribers of the state, then

      1. Mark the message as received if the matched subscription was an active subscriber
      3. Emit event that the message matched a subscription (message, target, source, active)
      3. Call the receive function of the state with (current data, message)
      4. If the receive function returned an update, then

         1. Replace the data in the state with the new value
         2. Emit event that we have gotten an updated piece of data

      5. If the receive function returned any messages, then

         1. Enqueue them last in the parent state (NOTE: Must be located after the one currently being processed)

   4. Move the message in the parent state (Enqueueing would cause issues with multiple messages)

3. If the current state-instance has an unprocessed sibling, then

   1. Traverse to the sibling
   2. Goto 1

4. Go to the parent node
5. Goto 2
